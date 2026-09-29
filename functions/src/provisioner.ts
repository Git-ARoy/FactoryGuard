import { CosmosClient, Database } from '@azure/cosmos';
import {
  seedMachines,
  seedTelemetry,
  seedIncidents,
  seedDocuments,
} from './seed-data';

let provisionPromise: Promise<void> | null = null;

export const REQUIRED_CONTAINERS = [
  { id: process.env.COSMOS_MACHINES_CONTAINER || 'machines', partitionKey: '/id' },
  { id: process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry', partitionKey: '/machineId' },
  { id: process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents', partitionKey: '/machineId' },
  { id: process.env.COSMOS_DOCUMENTS_CONTAINER || 'documents', partitionKey: '/machineId' },
];

/**
 * Ensures the Azure Cosmos DB database and all 4 containers exist and are populated.
 * Allows the Functions backend to be deployed and operate before the frontend without
 * failing due to missing containers.
 */
export async function ensureCosmosSchema(client: CosmosClient): Promise<void> {
  if (provisionPromise) {
    return provisionPromise;
  }

  provisionPromise = (async () => {
    try {
      const dbId = process.env.COSMOS_DATABASE || 'factoryguard';
      const { database } = await client.databases.createIfNotExists({ id: dbId });

      for (const c of REQUIRED_CONTAINERS) {
        await database.containers.createIfNotExists({
          id: c.id,
          partitionKey: { paths: [c.partitionKey] },
        });
      }

      // Check if machine container is empty; if so, perform initial seeding
      const machContainerId = process.env.COSMOS_MACHINES_CONTAINER || 'machines';
      const machContainer = database.container(machContainerId);
      const { resources: countResult } = await machContainer.items
        .query<number>({ query: 'SELECT VALUE COUNT(1) FROM c' })
        .fetchAll();

      const existingCount = countResult[0] || 0;
      if (existingCount === 0) {
        await seedContainers(database);
      }
    } catch (err) {
      provisionPromise = null;
      throw err;
    }
  })();

  return provisionPromise;
}

async function seedContainers(database: Database): Promise<void> {
  const machContainerId = process.env.COSMOS_MACHINES_CONTAINER || 'machines';
  const machContainer = database.container(machContainerId);
  for (const machine of seedMachines) {
    await machContainer.items.upsert(machine);
  }

  const telContainerId = process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry';
  const telContainer = database.container(telContainerId);
  for (const tel of seedTelemetry) {
    await telContainer.items.upsert(tel);
  }

  const incContainerId = process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents';
  const incContainer = database.container(incContainerId);
  for (const inc of seedIncidents) {
    await incContainer.items.upsert(inc);
  }

  const docContainerId = process.env.COSMOS_DOCUMENTS_CONTAINER || 'documents';
  const docContainer = database.container(docContainerId);
  for (const doc of seedDocuments) {
    await docContainer.items.upsert(doc);
  }
}
