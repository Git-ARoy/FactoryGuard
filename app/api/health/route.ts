import { jsonResponse } from '@/lib/api-client/response';
import { config } from '@/lib/config/env';
import { HealthCheckResponse } from '@/lib/domain/types';
import { getCosmosClient } from '@/lib/data/cosmos';
import { blobStorageService } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  let cosmosStatus: 'ok' | 'error' = 'error';
  let storageStatus: 'ok' | 'error' = 'error';

  if (config.cosmos.isConfigured) {
    try {
      const client = getCosmosClient();
      const { resources } = await client
        .database(config.cosmos.database)
        .container(config.cosmos.containers.machines)
        .items.query<number>({ query: 'SELECT VALUE 1' })
        .fetchAll();
      if (resources) {
        cosmosStatus = 'ok';
      }
    } catch {
      cosmosStatus = 'error';
    }
  }

  if (config.storage.isConfigured) {
    try {
      const containerClient = blobStorageService
        .getClient()
        .getContainerClient(config.storage.containerName);
      const exists = await containerClient.exists();
      if (exists) {
        storageStatus = 'ok';
      }
    } catch {
      storageStatus = 'error';
    }
  }

  const overallStatus =
    cosmosStatus === 'ok' && storageStatus === 'ok' ? 'ok' : 'degraded';

  const response: HealthCheckResponse = {
    status: overallStatus,
    version: config.version,
    timestamp: new Date().toISOString(),
    dependencies: {
      cosmos: cosmosStatus,
      storage: storageStatus,
    },
  };

  const statusCode = overallStatus === 'ok' ? 200 : 503;
  return jsonResponse(response, statusCode);
}
