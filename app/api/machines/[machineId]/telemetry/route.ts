import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { machineService } from '@/lib/services/machine.service';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { machineId: string } }
) {
  const { machineId } = params;

  try {
    const searchParams = req.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const data = await machineService.getTelemetryHistory(machineId, {
      limit,
      from,
      to,
    });

    return jsonResponse(data);
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.startsWith('MACHINE_NOT_FOUND')) {
      return errorResponse(
        'MACHINE_NOT_FOUND',
        `Machine ${machineId} does not exist.`,
        404
      );
    }

    TelemetryLogger.trackException(error, {
      endpoint: `/api/machines/${machineId}/telemetry`,
      machineId,
    });
    return errorResponse(
      'INTERNAL_ERROR',
      `Failed to retrieve telemetry history for ${machineId}`,
      500,
      error.message
    );
  }
}
