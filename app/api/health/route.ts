import { jsonResponse } from '@/lib/api-client/response';
import { config } from '@/lib/config/env';
import { HealthCheckResponse } from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response: HealthCheckResponse = {
    status: 'ok',
    version: config.version,
    timestamp: new Date().toISOString(),
    dependencies: {
      cosmos: config.cosmos.isConfigured ? 'ok' : 'local_fallback',
      storage: config.storage.isConfigured ? 'ok' : 'local_fallback',
    },
  };

  return jsonResponse(response, 200);
}
