import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import { evaluateTelemetry, SCENARIO_READINGS, SimulationScenario } from './domain';

// Centralized Cosmos helper for functions
function getCosmosDb() {
  const endpoint = process.env.COSMOS_ENDPOINT || '';
  const key = process.env.COSMOS_KEY || '';
  const database = process.env.COSMOS_DATABASE || 'factoryguard';
  if (!endpoint || !key) return null;
  const client = new CosmosClient({ endpoint, key });
  return client.database(database);
}

// 1. GET /api/health
app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    return {
      status: 200,
      jsonBody: {
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        dependencies: {
          cosmos: process.env.COSMOS_ENDPOINT ? 'ok' : 'unconfigured',
          storage: process.env.STORAGE_ACCOUNT_URL ? 'ok' : 'unconfigured',
        },
      },
    };
  },
});

// 2. GET /api/machines
app.http('getMachines', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const db = getCosmosDb();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }
      const container = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const { resources } = await container.items.query('SELECT * FROM c ORDER BY c.id ASC').fetchAll();
      return {
        status: 200,
        jsonBody: { items: resources, count: resources.length, limit: 100 },
      };
    } catch (err: unknown) {
      ctx.error('Failed to get machines', err);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve machines.' } },
      };
    }
  },
});

// 3. GET /api/machines/{machineId}
app.http('getMachineById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines/{machineId}',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const machineId = req.params.machineId;
    try {
      const db = getCosmosDb();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }
      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const telemetryContainer = db.container(process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry');
      const incidentContainer = db.container(process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents');

      const { resource: machine } = await machineContainer.item(machineId, machineId).read();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine ${machineId} not found.` } },
        };
      }

      const { resources: latestTel } = await telemetryContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.machineId = @m ORDER BY c.timestamp DESC OFFSET 0 LIMIT 1',
          parameters: [{ name: '@m', value: machineId }],
        })
        .fetchAll();

      const { resources: activeIncidents } = await incidentContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.machineId = @m AND c.status = "OPEN"',
          parameters: [{ name: '@m', value: machineId }],
        })
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
      ctx.error(`Failed to get machine ${machineId}`, err);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } },
      };
    }
  },
});

// 4. GET /api/machines/{machineId}/telemetry
app.http('getMachineTelemetry', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'machines/{machineId}/telemetry',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const machineId = req.params.machineId;
    const limit = Math.min(parseInt(req.query.get('limit') || '20', 10), 100);
    try {
      const db = getCosmosDb();
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
        })
        .fetchAll();

      return {
        status: 200,
        jsonBody: { machineId, items: resources, count: resources.length, limit },
      };
    } catch (err: unknown) {
      ctx.error(`Failed to get telemetry for ${machineId}`, err);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } },
      };
    }
  },
});

// 5. POST /api/simulations/events
app.http('simulationEvent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'simulations/events',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as { machineId?: string; scenario?: SimulationScenario };
      const machineId = body?.machineId;
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
          jsonBody: { error: { code: 'INVALID_SCENARIO', message: 'scenario must be NORMAL, WARNING, CRITICAL, or RECOVERY.' } },
        };
      }

      const db = getCosmosDb();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }

      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const telemetryContainer = db.container(process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry');
      const incidentContainer = db.container(process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents');

      const { resource: machine } = await machineContainer.item(machineId, machineId).read();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine ${machineId} does not exist.` } },
        };
      }

      const snapshot = SCENARIO_READINGS[scenario];
      const now = new Date().toISOString();
      const evalResult = evaluateTelemetry(snapshot);

      // Update machine
      const updatedMachine = {
        ...machine,
        status: evalResult.status,
        healthScore: evalResult.healthScore,
        lastTelemetryAt: now,
        updatedAt: now,
      };
      await machineContainer.items.upsert(updatedMachine);

      // Persist telemetry
      const telEvent = {
        id: `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        machineId,
        timestamp: now,
        temperatureC: snapshot.temperatureC,
        vibrationMmS: snapshot.vibrationMmS,
        pressurePsi: snapshot.pressurePsi,
        operatingHours: machine.operatingHours || 1000,
        scenario,
        source: 'simulator',
      };
      await telemetryContainer.items.create(telEvent);

      let incidentObj = null;
      if (evalResult.anomalyDetected && evalResult.severity && evalResult.incidentType) {
        const newIncident = {
          id: `inc-${Date.now()}`,
          machineId,
          severity: evalResult.severity,
          type: evalResult.incidentType,
          title: evalResult.title,
          description: evalResult.description,
          status: 'OPEN',
          detectedAt: now,
          resolvedAt: null,
          triggerTelemetryId: telEvent.id,
          telemetrySnapshot: snapshot,
        };
        await incidentContainer.items.create(newIncident);
        incidentObj = { id: newIncident.id, severity: newIncident.severity, status: newIncident.status };
      }

      ctx.log(`Simulation event completed for ${machineId}: ${scenario} -> ${evalResult.status}`);

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
      ctx.error('Simulation event failed', err);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } },
      };
    }
  },
});

// 6. POST /api/simulations/reset
app.http('simulationReset', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'simulations/reset',
  handler: async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    try {
      const body = (await req.json()) as { machineId?: string };
      const machineId = body?.machineId;
      if (!machineId) {
        return {
          status: 400,
          jsonBody: { error: { code: 'INVALID_REQUEST', message: 'machineId is required.' } },
        };
      }

      const db = getCosmosDb();
      if (!db) {
        return {
          status: 503,
          jsonBody: { error: { code: 'COSMOS_UNAVAILABLE', message: 'Cosmos DB not configured.' } },
        };
      }

      const machineContainer = db.container(process.env.COSMOS_MACHINES_CONTAINER || 'machines');
      const { resource: machine } = await machineContainer.item(machineId, machineId).read();
      if (!machine) {
        return {
          status: 404,
          jsonBody: { error: { code: 'MACHINE_NOT_FOUND', message: `Machine ${machineId} does not exist.` } },
        };
      }

      const now = new Date().toISOString();
      await machineContainer.items.upsert({
        ...machine,
        status: 'NORMAL',
        healthScore: 96,
        updatedAt: now,
      });

      return {
        status: 200,
        jsonBody: {
          success: true,
          machineId,
          status: 'NORMAL',
          resolvedIncidentIds: [],
        },
      };
    } catch (err: unknown) {
      ctx.error('Simulation reset failed', err);
      return {
        status: 500,
        jsonBody: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error.' } },
      };
    }
  },
});
