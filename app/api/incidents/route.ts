import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { incidentService } from '@/lib/services/incident.service';
import { IncidentStatus, IncidentSeverity } from '@/lib/domain/types';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') as IncidentStatus | null;
    const severity = searchParams.get('severity') as IncidentSeverity | null;
    const machineId = searchParams.get('machineId') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 25;

    if (status && !['OPEN', 'RESOLVED'].includes(status)) {
      return errorResponse(
        'INVALID_REQUEST',
        'status must be OPEN or RESOLVED',
        400
      );
    }
    if (severity && !['WARNING', 'CRITICAL'].includes(severity)) {
      return errorResponse(
        'INVALID_REQUEST',
        'severity must be WARNING or CRITICAL',
        400
      );
    }

    const data = await incidentService.getIncidents({
      status: status || undefined,
      severity: severity || undefined,
      machineId,
      limit,
    });

    return jsonResponse(data);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, { endpoint: '/api/incidents' });
    return errorResponse(
      'INTERNAL_ERROR',
      'Failed to retrieve incidents',
      500,
      error.message
    );
  }
}
