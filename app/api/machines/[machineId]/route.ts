import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { machineService } from '@/lib/services/machine.service';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { machineId: string } }
) {
  const { machineId } = params;

  try {
    const detail = await machineService.getMachineDetail(machineId);
    if (!detail) {
      return errorResponse(
        'MACHINE_NOT_FOUND',
        `Machine ${machineId} does not exist.`,
        404
      );
    }

    return jsonResponse(detail);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, {
      endpoint: `/api/machines/${machineId}`,
      machineId,
    });
    return errorResponse(
      'INTERNAL_ERROR',
      `Failed to retrieve machine ${machineId}`,
      500,
      error.message
    );
  }
}
