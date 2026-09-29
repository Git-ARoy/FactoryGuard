import { CosmosClient, Database } from '@azure/cosmos';
import { config } from '../../config/env';
import seedMachines from '../../../data/seed/machines.json';
import seedTelemetry from '../../../data/seed/telemetry.json';
import seedIncidents from '../../../data/seed/incidents.json';
import seedDocuments from '../../../data/seed/documents.json';

let provisionPromise: Promise<void> | null = null;

export interface ContainerDef {
  id: string;
  partitionKey: string;
}

export const REQUIRED_CONTAINERS: ContainerDef[] = [
  { id: 'machines', partitionKey: '/id' },
  { id: 'telemetry', partitionKey: '/machineId' },
  { id: 'incidents', partitionKey: '/machineId' },
  { id: 'documents', partitionKey: '/machineId' },
];

/**
 * Ensures the Azure Cosmos DB database and all 4 required containers exist.
 * If containers are empty, automatically seeds initial machines, telemetry,
 * incidents, and document metadata so no manual creation or seeding is needed in Azure.
 */
export async function ensureCosmosDatabaseAndContainers(client: CosmosClient): Promise<void> {
  if (provisionPromise) {
    return provisionPromise;
  }

  provisionPromise = (async () => {
    try {
      const dbId = config.cosmos.database || 'factoryguard';
      const { database } = await client.databases.createIfNotExists({ id: dbId });

      for (const c of REQUIRED_CONTAINERS) {
        await database.containers.createIfNotExists({
          id: c.id,
          partitionKey: { paths: [c.partitionKey] },
        });
      }

      // Check if machine container is empty; if so, perform automatic initial seeding
      const machContainer = database.container('machines');
      const { resources: countResult } = await machContainer.items
        .query<number>({ query: 'SELECT VALUE COUNT(1) FROM c' })
        .fetchAll();

      const existingCount = countResult[0] || 0;
      if (existingCount === 0) {
        console.log('[Cosmos DB Provisioner] Database is empty. Auto-seeding initial dataset...');
        await seedCosmosContainers(database);
        console.log('[Cosmos DB Provisioner] Auto-seeding completed successfully.');
      }
    } catch (err) {
      // Reset provisionPromise on failure to allow retry on subsequent requests
      provisionPromise = null;
      console.error('[Cosmos DB Provisioner] Provisioning or auto-seeding failed:', err);
      throw err;
    }
  })();

  return provisionPromise;
}

export async function seedCosmosContainers(database: Database): Promise<void> {
  // 1. Seed Machines
  const machContainer = database.container('machines');
  for (const machine of seedMachines) {
    await machContainer.items.upsert(machine);
  }

  // 2. Seed Telemetry
  const telContainer = database.container('telemetry');
  for (const tel of seedTelemetry) {
    await telContainer.items.upsert(tel);
  }

  // 3. Seed Incidents
  const incContainer = database.container('incidents');
  for (const inc of seedIncidents) {
    await incContainer.items.upsert(inc);
  }

  // 4. Seed Documents Metadata
  const docContainer = database.container('documents');
  for (const doc of seedDocuments) {
    await docContainer.items.upsert(doc);
  }
}
