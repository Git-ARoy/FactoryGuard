import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { incidentService } from '@/lib/services/incident.service';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  const { incidentId } = params;

  try {
    const incident = await incidentService.getIncidentById(incidentId);
    if (!incident) {
      return errorResponse(
        'INCIDENT_NOT_FOUND',
        `Incident ${incidentId} does not exist.`,
        404
      );
    }

    return jsonResponse(incident);
  } catch (err: unknown) {
    const error = err as Error;
    TelemetryLogger.trackException(error, {
      endpoint: `/api/incidents/${incidentId}`,
      incidentId,
    });
    return errorResponse(
      'INTERNAL_ERROR',
      `Failed to retrieve incident ${incidentId}`,
      500,
      error.message
    );
  }
}
