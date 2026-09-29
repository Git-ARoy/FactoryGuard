/**
 * FactoryGuard Azure Seeding Script
 * Seeds Azure Cosmos DB containers and Azure Blob Storage container with realistic industrial dataset.
 *
 * Usage:
 *   npx ts-node scripts/seed-cosmos.ts
 */

import { CosmosClient } from '@azure/cosmos';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';

// Seed data
import seedMachines from '../data/seed/machines.json';
import seedTelemetry from '../data/seed/telemetry.json';
import seedIncidents from '../data/seed/incidents.json';
import seedDocuments from '../data/seed/documents.json';

async function seedAzure() {
  console.log('====================================================');
  console.log('FactoryGuard - Azure Data Seeding Tool');
  console.log('====================================================');

  const cosmosEndpoint = process.env.COSMOS_ENDPOINT?.trim();
  const cosmosKey = process.env.COSMOS_KEY?.trim();
  const cosmosDatabase = process.env.COSMOS_DATABASE || 'factoryguard';

  if (!cosmosEndpoint || !cosmosKey) {
    console.warn('[Cosmos DB] COSMOS_ENDPOINT or COSMOS_KEY missing in environment.');
    console.warn('[Cosmos DB] Skipping Cosmos DB remote seeding. Local in-memory repository will be used.');
  } else {
    console.log(`[Cosmos DB] Connecting to ${cosmosEndpoint}...`);
    const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });

    console.log(`[Cosmos DB] Ensuring database "${cosmosDatabase}" exists...`);
    const { database } = await client.databases.createIfNotExists({ id: cosmosDatabase });

    // Containers with partition keys matching ARCHITECTURE.md
    const containers = [
      { id: 'machines', partitionKey: '/id' },
      { id: 'telemetry', partitionKey: '/machineId' },
      { id: 'incidents', partitionKey: '/machineId' },
      { id: 'documents', partitionKey: '/machineId' },
    ];

    for (const c of containers) {
      console.log(`[Cosmos DB] Ensuring container "${c.id}" (pk: ${c.partitionKey})...`);
      await database.containers.createIfNotExists({
        id: c.id,
        partitionKey: { paths: [c.partitionKey] },
      });
    }

    // Seed machines
    console.log(`[Cosmos DB] Seeding ${seedMachines.length} machines...`);
    const machContainer = database.container('machines');
    for (const m of seedMachines) {
      await machContainer.items.upsert(m);
    }

    // Seed telemetry
    console.log(`[Cosmos DB] Seeding ${seedTelemetry.length} telemetry records...`);
    const telContainer = database.container('telemetry');
    for (const t of seedTelemetry) {
      await telContainer.items.upsert(t);
    }

    // Seed incidents
    console.log(`[Cosmos DB] Seeding ${seedIncidents.length} incidents...`);
    const incContainer = database.container('incidents');
    for (const inc of seedIncidents) {
      await incContainer.items.upsert(inc);
    }

    // Seed document metadata
    console.log(`[Cosmos DB] Seeding ${seedDocuments.length} document metadata records...`);
    const docContainer = database.container('documents');
    for (const doc of seedDocuments) {
      await docContainer.items.upsert(doc);
    }

    console.log('[Cosmos DB] Successfully seeded all containers!');
  }

  // Blob Storage
  const storageConn = process.env.STORAGE_CONNECTION_STRING?.trim();
  const storageUrl = process.env.STORAGE_ACCOUNT_URL?.trim();
  const storageContainerName = process.env.STORAGE_CONTAINER_NAME || 'documents';

  if (!storageConn && !storageUrl) {
    console.warn('[Blob Storage] STORAGE_CONNECTION_STRING or STORAGE_ACCOUNT_URL missing in environment.');
    console.warn('[Blob Storage] Skipping Blob Storage remote seeding. Local assets will be used.');
  } else {
    console.log('[Blob Storage] Connecting to Azure Blob Storage...');
    const blobServiceClient = storageConn
      ? BlobServiceClient.fromConnectionString(storageConn)
      : new BlobServiceClient(storageUrl!);

    const containerClient = blobServiceClient.getContainerClient(storageContainerName);
    console.log(`[Blob Storage] Ensuring container "${storageContainerName}" exists...`);
    await containerClient.createIfNotExists({ access: 'blob' });

    const sampleDir = path.join(__dirname, '..', 'data', 'seed', 'sample-docs');
    if (fs.existsSync(sampleDir)) {
      const files = fs.readdirSync(sampleDir);
      for (const file of files) {
        const filePath = path.join(sampleDir, file);
        const blockBlobClient = containerClient.getBlockBlobClient(file);
        const fileBuffer = fs.readFileSync(filePath);
        console.log(`[Blob Storage] Uploading ${file} (${fileBuffer.length} bytes)...`);
        await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
          blobHTTPHeaders: {
            blobContentType: file.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
          },
        });
      }
      console.log('[Blob Storage] Successfully uploaded sample documents!');
    }
  }

  console.log('====================================================');
  console.log('Seeding verification completed successfully.');
  console.log('====================================================');
}

seedAzure().catch((err) => {
  console.error('[Error] Seeding failed:', err);
  process.exit(1);
});
