import { CosmosClient, Container, SqlParameter } from '@azure/cosmos';
import {
  IMachineRepository,
  MachineFilters,
  ITelemetryRepository,
  TelemetryFilters,
  IIncidentRepository,
  IncidentFilters,
  IDocumentRepository,
  DocumentFilters,
} from '../interfaces';
import {
  Machine,
  MachineStatus,
  TelemetryEvent,
  Incident,
  IncidentType,
  DocumentMetadata,
} from '../../domain/types';
import { config } from '../../config/env';

let cosmosClientInstance: CosmosClient | null = null;

function getCosmosClient(): CosmosClient {
  if (!cosmosClientInstance) {
    if (!config.cosmos.endpoint || !config.cosmos.key) {
      throw new Error('Cosmos DB credentials not configured');
    }
    cosmosClientInstance = new CosmosClient({
      endpoint: config.cosmos.endpoint,
      key: config.cosmos.key,
    });
  }
  return cosmosClientInstance;
}

function getContainer(containerName: string): Container {
  const client = getCosmosClient();
  return client.database(config.cosmos.database).container(containerName);
}

export class CosmosMachineRepository implements IMachineRepository {
  private get container(): Container {
    return getContainer(config.cosmos.containers.machines);
  }

  async getAll(filters?: MachineFilters): Promise<Machine[]> {
    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: SqlParameter[] = [];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }
    if (filters?.line) {
      query += ' AND CONTAINS(LOWER(c.line), LOWER(@line))';
      parameters.push({ name: '@line', value: filters.line });
    }
    if (filters?.search) {
      query +=
        ' AND (CONTAINS(LOWER(c.id), LOWER(@search)) OR CONTAINS(LOWER(c.name), LOWER(@search)) OR CONTAINS(LOWER(c.location), LOWER(@search)))';
      parameters.push({ name: '@search', value: filters.search });
    }

    const limit = Math.min(filters?.limit || 100, 100);
    query += ` ORDER BY c.id ASC OFFSET 0 LIMIT ${limit}`;

    const { resources } = await this.container.items
      .query<Machine>({ query, parameters })
      .fetchAll();

    return resources;
  }

  async getById(id: string): Promise<Machine | null> {
    try {
      const { resource } = await this.container.item(id, id).read<Machine>();
      return resource || null;
    } catch (err: unknown) {
      if ((err as { statusCode?: number }).statusCode === 404) return null;
      throw err;
    }
  }

  async update(machine: Machine): Promise<Machine> {
    const updated = {
      ...machine,
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.items.upsert<Machine>(updated);
    return resource!;
  }

  async updateStatus(
    id: string,
    status: MachineStatus,
    healthScore: number,
    lastTelemetryAt: string
  ): Promise<Machine> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Machine ${id} not found in Cosmos DB`);
    }

    const updated: Machine = {
      ...existing,
      status,
      healthScore,
      lastTelemetryAt,
      updatedAt: new Date().toISOString(),
    };

    const { resource } = await this.container.items.upsert<Machine>(updated);
    return resource!;
  }
}

export class CosmosTelemetryRepository implements ITelemetryRepository {
  private get container(): Container {
    return getContainer(config.cosmos.containers.telemetry);
  }

  async record(event: TelemetryEvent): Promise<TelemetryEvent> {
    const { resource } = await this.container.items.create<TelemetryEvent>(
      event
    );
    return resource!;
  }

  async getHistory(
    machineId: string,
    filters?: TelemetryFilters
  ): Promise<TelemetryEvent[]> {
    let query = 'SELECT * FROM c WHERE c.machineId = @machineId';
    const parameters: SqlParameter[] = [
      { name: '@machineId', value: machineId },
    ];

    if (filters?.from) {
      query += ' AND c.timestamp >= @from';
      parameters.push({ name: '@from', value: filters.from });
    }
    if (filters?.to) {
      query += ' AND c.timestamp <= @to';
      parameters.push({ name: '@to', value: filters.to });
    }

    const limit = Math.min(filters?.limit || 20, 100);
    query += ` ORDER BY c.timestamp DESC OFFSET 0 LIMIT ${limit}`;

    const { resources } = await this.container.items
      .query<TelemetryEvent>(
        { query, parameters },
        { partitionKey: machineId }
      )
      .fetchAll();

    return resources;
  }

  async getLatest(machineId: string): Promise<TelemetryEvent | null> {
    const history = await this.getHistory(machineId, { limit: 1 });
    return history[0] || null;
  }
}

export class CosmosIncidentRepository implements IIncidentRepository {
  private get container(): Container {
    return getContainer(config.cosmos.containers.incidents);
  }

  async getAll(filters?: IncidentFilters): Promise<Incident[]> {
    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: SqlParameter[] = [];

    if (filters?.status) {
      query += ' AND c.status = @status';
      parameters.push({ name: '@status', value: filters.status });
    }
    if (filters?.severity) {
      query += ' AND c.severity = @severity';
      parameters.push({ name: '@severity', value: filters.severity });
    }
    if (filters?.machineId) {
      query += ' AND c.machineId = @machineId';
      parameters.push({ name: '@machineId', value: filters.machineId });
    }

    const limit = Math.min(filters?.limit || 25, 100);
    query += ` ORDER BY c.detectedAt DESC OFFSET 0 LIMIT ${limit}`;

    const { resources } = await this.container.items
      .query<Incident>({ query, parameters })
      .fetchAll();

    return resources;
  }

  async getById(id: string): Promise<Incident | null> {
    const query = 'SELECT * FROM c WHERE c.id = @id';
    const { resources } = await this.container.items
      .query<Incident>({
        query,
        parameters: [{ name: '@id', value: id }],
      })
      .fetchAll();

    return resources[0] || null;
  }

  async findActiveByMachine(machineId: string): Promise<Incident[]> {
    const query =
      'SELECT * FROM c WHERE c.machineId = @machineId AND c.status = "OPEN"';
    const { resources } = await this.container.items
      .query<Incident>(
        {
          query,
          parameters: [{ name: '@machineId', value: machineId }],
        },
        { partitionKey: machineId }
      )
      .fetchAll();

    return resources;
  }

  async findActiveByMachineAndType(
    machineId: string,
    type: IncidentType
  ): Promise<Incident | null> {
    const query =
      'SELECT * FROM c WHERE c.machineId = @machineId AND c.type = @type AND c.status = "OPEN"';
    const { resources } = await this.container.items
      .query<Incident>(
        {
          query,
          parameters: [
            { name: '@machineId', value: machineId },
            { name: '@type', value: type },
          ],
        },
        { partitionKey: machineId }
      )
      .fetchAll();

    return resources[0] || null;
  }

  async create(incident: Incident): Promise<Incident> {
    const { resource } = await this.container.items.create<Incident>(incident);
    return resource!;
  }

  async update(incident: Incident): Promise<Incident> {
    const { resource } = await this.container.items.upsert<Incident>(incident);
    return resource!;
  }

  async resolve(id: string, resolvedAt?: string): Promise<Incident | null> {
    const incident = await this.getById(id);
    if (!incident) return null;

    const resolved: Incident = {
      ...incident,
      status: 'RESOLVED',
      resolvedAt: resolvedAt || new Date().toISOString(),
    };
    return this.update(resolved);
  }

  async resolveActiveForMachine(machineId: string): Promise<string[]> {
    const openIncidents = await this.findActiveByMachine(machineId);
    const resolvedIds: string[] = [];
    const now = new Date().toISOString();

    for (const inc of openIncidents) {
      await this.update({
        ...inc,
        status: 'RESOLVED',
        resolvedAt: now,
      });
      resolvedIds.push(inc.id);
    }

    return resolvedIds;
  }
}

export class CosmosDocumentRepository implements IDocumentRepository {
  private get container(): Container {
    return getContainer(config.cosmos.containers.documents);
  }

  async getAll(filters?: DocumentFilters): Promise<DocumentMetadata[]> {
    let query = 'SELECT * FROM c WHERE 1=1';
    const parameters: SqlParameter[] = [];

    if (filters?.machineId) {
      query += ' AND c.machineId = @machineId';
      parameters.push({ name: '@machineId', value: filters.machineId });
    }
    if (filters?.category) {
      query += ' AND c.category = @category';
      parameters.push({ name: '@category', value: filters.category });
    }

    const { resources } = await this.container.items
      .query<DocumentMetadata>({ query, parameters })
      .fetchAll();

    return resources;
  }

  async getById(id: string): Promise<DocumentMetadata | null> {
    const query = 'SELECT * FROM c WHERE c.id = @id';
    const { resources } = await this.container.items
      .query<DocumentMetadata>({
        query,
        parameters: [{ name: '@id', value: id }],
      })
      .fetchAll();

    return resources[0] || null;
  }

  async create(doc: DocumentMetadata): Promise<DocumentMetadata> {
    const { resource } = await this.container.items.create<DocumentMetadata>(
      doc
    );
    return resource!;
  }
}
