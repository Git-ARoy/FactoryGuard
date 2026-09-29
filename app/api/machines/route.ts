import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { machineService } from '@/lib/services/machine.service';
import { MachineStatus } from '@/lib/domain/types';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') as MachineStatus | null;
    const line = searchParams.get('line') || undefined;
    const search = searchParams.get('search') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 25;

    if (status && !['NORMAL', 'WARNING', 'CRITICAL'].includes(status)) {
      return errorResponse(
        'INVALID_REQUEST',
        'status must be NORMAL, WARNING, or CRITICAL',
        400
      );
    }

    const data = await machineService.getMachines({
      status: status || undefined,
      line,
      search,
      limit,
    });

    return jsonResponse(data);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, { endpoint: '/api/machines' });
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve machines',
      500,
      error.message
    );
  }
}
