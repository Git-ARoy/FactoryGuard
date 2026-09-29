import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient, Database } from '@azure/cosmos';
import {
  evaluateTelemetry,
  SCENARIO_READINGS,
  SimulationScenario,
  MachineStatus,
  IncidentSeverity,
  IncidentType,
} from './domain';
import { ensureCosmosSchema } from './provisioner';

interface MachineRecord {
  id: string;
  name: string;
  machineType: string;
  line: string;
  location: string;
  status: MachineStatus;
  healthScore: number;
  lastTelemetryAt: string;
  operatingHours: number;
  maintenanceDueAt: string;
  createdAt: string;
  updatedAt: string;
}

interface IncidentRecord {
  id: string;
  machineId: string;
  severity: IncidentSeverity;
  type: IncidentType;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  detectedAt: string;
  resolvedAt: string | null;
  triggerTelemetryId: string;
  telemetrySnapshot: {
    temperatureC: number;
    vibrationMmS: number;
    pressurePsi: number;
  };
}

let cachedClient: CosmosClient | null = null;

function getCosmosClient(): CosmosClient | null {
  const endpoint = process.env.COSMOS_ENDPOINT?.trim() || '';
  const key = process.env.COSMOS_KEY?.trim() || '';
  if (!endpoint || !key) return null;

  if (!cachedClient) {
    cachedClient = new CosmosClient({ endpoint, key });
  }
  return cachedClient;
}

async function getInitializedDatabase(): Promise<Database | null> {
  const client = getCosmosClient();
  if (!client) return null;

  await ensureCosmosSchema(client);
  const databaseId = process.env.COSMOS_DATABASE || 'factoryguard';
  return client.database(databaseId);
}

// -------------------------------------------------------------
// 1. GET /api/health
// Active deep health check verifying database and container schema
// -------------------------------------------------------------
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    let cosmosStatus: 'ok' | 'error' = 'error';
    const missingEnv: string[] = [];

    if (!process.env.COSMOS_ENDPOINT) missingEnv.push('COSMOS_ENDPOINT');
    if (!process.env.COSMOS_KEY) missingEnv.push('COSMOS_KEY');

    if (missingEnv.length === 0) {
      try {
        const db = await getInitializedDatabase();
        if (db) {
          const machContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
          const { resources } = await machContainer.items
            .query<number>({ query: 'SELECT VALUE 1' })
            .fetchAll();
          if (resources && resources.length >= 0) {
            cosmosStatus = 'ok';
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        ctx.error('[Health] Cosmos connectivity check failed:', error);
        cosmosStatus = 'error';
      }
    }

    const overallStatus = cosmosStatus === 'ok' ? 'ok' : 'degraded';

    return {
      status: overallStatus === 'ok' ? 200 : 503,
      jsonBody: {
        status: overallStatus,
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        service: 'FactoryGuard Serverless Processing',
        dependencies: {
          cosmos: cosmosStatus,
        },
        ...(missingEnv.length > 0 ? { unconfigured: missingEnv } : {}),
      },
    };
  },
});

// -------------------------------------------------------------
// 2. GET /api/machines
// -------------------------------------------------------------
app.http('getMachines', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines',
  handler: async (_req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const db = await getInitializedDatabase();
      if (!db) {
        return {
          status: 503,
          jsonBody: {
            error: {
              code: 'COSMOS_UNAVAILABLE',
              message: 'Cosmos DB credentials not configured in Function App settings.',
            },
          },
        };
      }
      const container = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const { resources } = await container.items
        .query<MachineRecord>('SELECT * FROM c ORDER BY c.id ASC')
        .fetchAll();

      return {
        status: 200,
        jsonBody: { items: resources, count: resources.length, limit: 100 },
      };
    } catch (err: unknown) {
      const error = err as Error;
      ctx.error('[getMachines] Failed to get machines:', error);
      return {
        status: 500,
        jsonBody: {
          error: {
            code: 'INTERNAL_ERROR',
            message: `Failed to retrieve machines: ${error.message}`,
          },
        },
      };
    }
  },
});

// -------------------------------------------------------------
// 3. GET /api/machines/{machineId}
// -------------------------------------------------------------
app.http('getMachineById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines/{machineId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const machineId = req.params.machineId?.trim();
    if (!machineId) {
      return {
        status: 400,
        jsonBody: { error: { code: 'INVALID_REQUEST', message: 'machineId path parameter is required.' } },
      };
    }

    try {
      const db = await getInitializedDatabase();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }
      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const telemetryContainer = db.container(process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry');
      const incidentContainer = db.container(process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents');

      const { resource: machine } = await machineContainer.item(machineId, machineId).read<MachineRecord>();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine "${machineId}" not found.` } },
        };
      }

      const { resources: latestTel } = await telemetryContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.machineId = @m ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1',
          parameters: [{ name: '@m', value: machineId }],
        }, { partitionKey: machineId })
        .fetchAll();

      const { resources: activeIncidents } = await incidentContainer.items
        .query<IncidentRecord>({
          query: 'SELECT * FROM c WHERE c.machineId = @m AND c.status = "OPEN"',
          parameters: [{ name: '@m', value: machineId }],
        }, { partitionKey: machineId })
        .fetchAll();

      return {
        status: 200,
        jsonBody: {
          machine,
          latestTelemetry: latestTel[0] || null,
          activeIncidents,
          documents: [],
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      ctx.error(`[getMachineById] Failed for machine ${machineId}:`, error);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: `Failed to retrieve machine: ${error.message}` } },
      };
    }
  },
});

// -------------------------------------------------------------
// 4. GET /api/machines/{machineId}/telemetry
// -------------------------------------------------------------
app.http('getMachineTelemetry', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines/{machineId}/telemetry',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const machineId = req.params.machineId?.trim();
    if (!machineId) {
      return {
        status: 400,
        jsonBody: { error: { code: 'INVALID_REQUEST', message: 'machineId path parameter is required.' } },
      };
    }

    const rawLimit = parseInt(req.query.get('limit') || '20', 10);
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 20 : Math.min(rawLimit, 100);

    try {
      const db = await getInitializedDatabase();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }
      const telemetryContainer = db.container(process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry');
      const { resources } = await telemetryContainer.items
        .query({
          query: `SELECT * FROM c WHERE c.machineId = @m ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`,
          parameters: [{ name: '@m', value: machineId }],
        }, { partitionKey: machineId })
        .fetchAll();

      return {
        status: 200,
        jsonBody: { machineId, items: resources, count: resources.length, limit },
      };
    } catch (err: unknown) {
      const error = err as Error;
      ctx.error(`[getMachineTelemetry] Failed for ${machineId}:`, error);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: `Internal server error: ${error.message}` } },
      };
    }
  },
});

// -------------------------------------------------------------
// 5. POST /api/simulations/events
// Unified deterministic anomaly detection & deduplicated incident lifecycle
// -------------------------------------------------------------
app.http('simulationEvent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'simulations/events',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      let body: { machineId?: string; scenario?: SimulationScenario };
      try {
        body = (await req.json()) as { machineId?: string; scenario?: SimulationScenario };
      } catch {
        return {
          status: 400,
          jsonBody: { error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON.' } },
        };
      }

      const machineId = body?.machineId?.trim();
      const scenario = body?.scenario;

      if (!machineId) {
        return {
          status: 400,
          jsonBody: { error: { code: 'INVALID_REQUEST', message: 'machineId is required.' } },
        };
      }
      if (!scenario || !['NORMAL', 'WARNING', 'CRITICAL', 'RECOVERY'].includes(scenario)) {
        return {
          status: 400,
          jsonBody: {
            error: {
              code: 'INVALID_SCENARIO',
              message: 'scenario must be NORMAL, WARNING, CRITICAL, or RECOVERY.',
            },
          },
        };
      }

      const db = await getInitializedDatabase();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }

      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const telemetryContainer = db.container(process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry');
      const incidentContainer = db.container(process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents');

      const { resource: machine } = await machineContainer.item(machineId, machineId).read<MachineRecord>();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine "${machineId}" does not exist.` } },
        };
      }

      const snapshot = SCENARIO_READINGS[scenario];
      const now = new Date().toISOString();
      const evalResult = evaluateTelemetry(snapshot);

      // 1. Update machine entity
      const updatedMachine: MachineRecord = {
        ...machine,
        status: evalResult.status,
        healthScore: evalResult.healthScore,
        lastTelemetryAt: now,
        updatedAt: now,
      };
      await machineContainer.items.upsert<MachineRecord>(updatedMachine);

      // 2. Persist telemetry time-series record
      const telEvent = {
        id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        machineId,
        timestamp: now,
        temperatureC: snapshot.temperatureC,
        vibrationMmS: snapshot.vibrationMmS,
        pressurePsi: snapshot.pressurePsi,
        operatingHours: machine.operatingHours || 1000,
        scenario,
        source: 'azure-functions-simulator',
      };
      await telemetryContainer.items.create(telEvent);

      // 3. Incident Lifecycle: Deduplicate open incidents or resolve on recovery
      let incidentObj: { id: string; severity: IncidentSeverity; status: string } | null = null;

      if (evalResult.anomalyDetected && evalResult.severity && evalResult.incidentType) {
        // Check for existing active open incident for this machine to prevent duplicate spam
        const { resources: activeIncidents } = await incidentContainer.items
          .query<IncidentRecord>({
            query: 'SELECT * FROM c WHERE c.machineId = @m AND c.status = "OPEN"',
            parameters: [{ name: '@m', value: machineId }],
          }, { partitionKey: machineId })
          .fetchAll();

        if (activeIncidents.length > 0) {
          // Update the existing open incident
          const existing = activeIncidents[0];
          const updated: IncidentRecord = {
            ...existing,
            severity: evalResult.severity,
            type: evalResult.incidentType,
            title: evalResult.title || existing.title,
            description: evalResult.description || existing.description,
            telemetrySnapshot: snapshot,
            triggerTelemetryId: telEvent.id,
          };
          await incidentContainer.items.upsert(updated);
          incidentObj = { id: updated.id, severity: updated.severity, status: updated.status };
        } else {
          // Create new incident
          const newIncident: IncidentRecord = {
            id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            machineId,
            severity: evalResult.severity,
            type: evalResult.incidentType,
            title: evalResult.title || `${machineId} ${evalResult.severity} condition`,
            description: evalResult.description || `Abnormal telemetry detected on ${machineId}`,
            status: 'OPEN',
            detectedAt: now,
            resolvedAt: null,
            triggerTelemetryId: telEvent.id,
            telemetrySnapshot: snapshot,
          };
          await incidentContainer.items.create(newIncident);
          incidentObj = { id: newIncident.id, severity: newIncident.severity, status: newIncident.status };
        }
      } else if (scenario === 'RECOVERY' || evalResult.status === 'NORMAL') {
        // Automatic incident resolution on recovery: close all open incidents for this machine
        const { resources: activeIncidents } = await incidentContainer.items
          .query<IncidentRecord>({
            query: 'SELECT * FROM c WHERE c.machineId = @m AND c.status = "OPEN"',
            parameters: [{ name: '@m', value: machineId }],
          }, { partitionKey: machineId })
          .fetchAll();

        for (const inc of activeIncidents) {
          await incidentContainer.items.upsert({
            ...inc,
            status: 'RESOLVED',
            resolvedAt: now,
          });
        }
      }

      ctx.log(`[SimulationEvent] ${machineId}: ${scenario} -> ${evalResult.status} (Health: ${evalResult.healthScore})`);

      return {
        status: 200,
        jsonBody: {
          success: true,
          scenario,
          machine: {
            id: machineId,
            status: evalResult.status,
            healthScore: evalResult.healthScore,
          },
          telemetry: telEvent,
          incident: incidentObj,
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      ctx.error('[simulationEvent] Failed:', error);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: `Internal simulation error: ${error.message}` } },
      };
    }
  },
});

// -------------------------------------------------------------
// 6. POST /api/simulations/reset
// Restores machine to NORMAL and resolves any open incidents cleanly
// -------------------------------------------------------------
app.http('simulationReset', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'simulations/reset',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      let body: { machineId?: string };
      try {
        body = (await req.json()) as { machineId?: string };
      } catch {
        return {
          status: 400,
          jsonBody: { error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON.' } },
        };
      }

      const machineId = body?.machineId?.trim();
      if (!machineId) {
        return {
          status: 400,
          jsonBody: { error: { code: 'INVALID_REQUEST', message: 'machineId is required.' } },
        };
      }

      const db = await getInitializedDatabase();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }

      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const incidentContainer = db.container(process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents');

      const { resource: machine } = await machineContainer.item(machineId, machineId).read<MachineRecord>();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine "${machineId}" does not exist.` } },
        };
      }

      const now = new Date().toISOString();

      // 1. Reset machine status
      await machineContainer.items.upsert<MachineRecord>({
        ...machine,
        status: 'NORMAL',
        healthScore: 96,
        updatedAt: now,
      });

      // 2. Resolve all open incidents for this machine in Cosmos DB
      const { resources: activeIncidents } = await incidentContainer.items
        .query<IncidentRecord>({
          query: 'SELECT * FROM c WHERE c.machineId = @m AND c.status = "OPEN"',
          parameters: [{ name: '@m', value: machineId }],
        }, { partitionKey: machineId })
        .fetchAll();

      const resolvedIncidentIds: string[] = [];
      for (const inc of activeIncidents) {
        await incidentContainer.items.upsert({
          ...inc,
          status: 'RESOLVED',
          resolvedAt: now,
        });
        resolvedIncidentIds.push(inc.id);
      }

      ctx.log(`[SimulationReset] Machine ${machineId} reset to NORMAL. Resolved incidents: ${resolvedIncidentIds.join(', ') || 'none'}`);

      return {
        status: 200,
        jsonBody: {
          success: true,
          machineId,
          status: 'NORMAL',
          resolvedIncidentIds,
        },
      };
    } catch (err: unknown) {
      const error = err as Error;
      ctx.error('[simulationReset] Failed:', error);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: `Internal reset error: ${error.message}` } },
      };
    }
  },
});
