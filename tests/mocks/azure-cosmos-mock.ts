import seedMachines from '../../data/seed/machines.json';
import seedTelemetry from '../../data/seed/telemetry.json';
import seedIncidents from '../../data/seed/incidents.json';
import seedDocuments from '../../data/seed/documents.json';

interface QuerySpec {
  query: string;
  parameters?: Array<{ name: string; value: unknown }>;
}

export class MockCosmosContainer {
  public id: string;
  public itemsStore: Map<string, any> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  get items() {
    return {
      query: <T = any>(querySpec: string | QuerySpec) => {
        return {
          fetchAll: async (): Promise<{ resources: T[] }> => {
            const queryString = typeof querySpec === 'string' ? querySpec : querySpec.query;
            const params = typeof querySpec === 'string' ? [] : querySpec.parameters || [];
            const paramMap = new Map(params.map((p) => [p.name, p.value]));

            if (queryString.includes('COUNT(1)')) {
              return { resources: [this.itemsStore.size as unknown as T] };
            }

            let results = Array.from(this.itemsStore.values());

            // 1. Filtering
            if (paramMap.has('@status')) {
              results = results.filter((item) => item.status === paramMap.get('@status'));
            } else if (queryString.includes('c.status = "OPEN"')) {
              results = results.filter((item) => item.status === 'OPEN');
            }

            if (paramMap.has('@severity')) {
              results = results.filter((item) => item.severity === paramMap.get('@severity'));
            }

            if (paramMap.has('@machineId')) {
              results = results.filter((item) => item.machineId === paramMap.get('@machineId'));
            }

            if (paramMap.has('@id')) {
              results = results.filter((item) => item.id === paramMap.get('@id'));
            }

            if (paramMap.has('@type')) {
              results = results.filter((item) => item.type === paramMap.get('@type'));
            }

            if (paramMap.has('@category')) {
              results = results.filter((item) => item.category === paramMap.get('@category'));
            }

            if (paramMap.has('@line')) {
              const lineVal = String(paramMap.get('@line')).toLowerCase();
              results = results.filter((item) => String(item.line || '').toLowerCase().includes(lineVal));
            }

            if (paramMap.has('@search')) {
              const searchVal = String(paramMap.get('@search')).toLowerCase();
              results = results.filter(
                (item) =>
                  String(item.id || '').toLowerCase().includes(searchVal) ||
                  String(item.name || '').toLowerCase().includes(searchVal) ||
                  String(item.location || '').toLowerCase().includes(searchVal)
              );
            }

            if (paramMap.has('@from')) {
              results = results.filter((item) => item.timestamp >= String(paramMap.get('@from')));
            }

            if (paramMap.has('@to')) {
              results = results.filter((item) => item.timestamp <= String(paramMap.get('@to')));
            }

            // 2. Ordering
            if (queryString.includes('ORDER BY c.id ASC')) {
              results.sort((a, b) => String(a.id).localeCompare(String(b.id)));
            } else if (queryString.includes('ORDER BY c.timestamp DESC')) {
              results.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
            } else if (queryString.includes('ORDER BY c.detectedAt DESC')) {
              results.sort((a, b) => String(b.detectedAt).localeCompare(String(a.detectedAt)));
            }

            // 3. Limit
            const limitMatch = queryString.match(/LIMIT\s+(\d+)/i);
            if (limitMatch) {
              const limit = parseInt(limitMatch[1], 10);
              results = results.slice(0, limit);
            }

            return { resources: results.map((r) => JSON.parse(JSON.stringify(r))) };
          },
        };
      },

      create: async <T = any>(item: any): Promise<{ resource: T }> => {
        const cloned = JSON.parse(JSON.stringify(item));
        this.itemsStore.set(cloned.id, cloned);
        return { resource: cloned };
      },

      upsert: async <T = any>(item: any): Promise<{ resource: T }> => {
        const cloned = JSON.parse(JSON.stringify(item));
        this.itemsStore.set(cloned.id, cloned);
        return { resource: cloned };
      },
    };
  }

  item(id: string, _partitionKey?: string) {
    return {
      read: async <T = any>(): Promise<{ resource: T | null }> => {
        const item = this.itemsStore.get(id);
        if (!item) {
          return { resource: null };
        }
        return { resource: JSON.parse(JSON.stringify(item)) };
      },
    };
  }
}

export class MockCosmosDatabase {
  public id: string;
  public containersMap: Map<string, MockCosmosContainer> = new Map();

  constructor(id: string) {
    this.id = id;
    this.containersMap.set('machines', new MockCosmosContainer('machines'));
    this.containersMap.set('telemetry', new MockCosmosContainer('telemetry'));
    this.containersMap.set('incidents', new MockCosmosContainer('incidents'));
    this.containersMap.set('documents', new MockCosmosContainer('documents'));
  }

  container(id: string): MockCosmosContainer {
    if (!this.containersMap.has(id)) {
      this.containersMap.set(id, new MockCosmosContainer(id));
    }
    return this.containersMap.get(id)!;
  }

  get containers() {
    return {
      createIfNotExists: async (def: { id: string }) => {
        return { container: this.container(def.id) };
      },
    };
  }
}

export class MockCosmosClient {
  public databasesMap: Map<string, MockCosmosDatabase> = new Map();

  constructor(_options?: any) {
    const defaultDb = new MockCosmosDatabase('factoryguard');
    this.databasesMap.set('factoryguard', defaultDb);
  }

  database(id: string): MockCosmosDatabase {
    if (!this.databasesMap.has(id)) {
      this.databasesMap.set(id, new MockCosmosDatabase(id));
    }
    return this.databasesMap.get(id)!;
  }

  get databases() {
    return {
      createIfNotExists: async (def: { id: string }) => {
        return { database: this.database(def.id) };
      },
    };
  }
}

export const globalMockCosmosClient = new MockCosmosClient();

export function resetMockCosmosToSeed() {
  const db = globalMockCosmosClient.database('factoryguard');
  
  // Re-seed machines
  const machCont = db.container('machines');
  machCont.itemsStore.clear();
  for (const m of seedMachines) {
    machCont.itemsStore.set(m.id, JSON.parse(JSON.stringify(m)));
  }

  // Re-seed telemetry
  const telCont = db.container('telemetry');
  telCont.itemsStore.clear();
  for (const t of seedTelemetry) {
    telCont.itemsStore.set(t.id, JSON.parse(JSON.stringify(t)));
  }

  // Re-seed incidents
  const incCont = db.container('incidents');
  incCont.itemsStore.clear();
  for (const i of seedIncidents) {
    incCont.itemsStore.set(i.id, JSON.parse(JSON.stringify(i)));
  }

  // Re-seed documents
  const docCont = db.container('documents');
  docCont.itemsStore.clear();
  for (const d of seedDocuments) {
    docCont.itemsStore.set(d.id, JSON.parse(JSON.stringify(d)));
  }
}

// Initial seed
resetMockCosmosToSeed();
