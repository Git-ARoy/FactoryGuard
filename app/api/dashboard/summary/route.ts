import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { dashboardService } from '@/lib/services/dashboard.service';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await dashboardService.getPlantSummary();
    return jsonResponse(summary);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, { endpoint: '/api/dashboard/summary' });
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to generate dashboard summary',
      500,
      error.message
    );
  }
}
