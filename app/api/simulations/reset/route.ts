import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { simulationService } from '@/lib/services/simulation.service';
import { config } from '@/lib/config/env';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { machineId?: string };

  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'INVALID_REQUEST',
      'Request body must be valid JSON',
      400
    );
  }

  const { machineId } = body;

  if (!machineId) {
    return errorResponse('INVALID_REQUEST', 'machineId is required', 400);
  }

  try {
    if (config.functions.isConfigured) {
      const functionUrl = `${config.functions.baseUrl}/api/simulations/reset`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.functions.internalSecret) {
        headers['x-functions-key'] = config.functions.internalSecret;
      }

      const funcRes = await fetch(functionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ machineId }),
      });

      const funcData = await funcRes.json();
      return jsonResponse(funcData, funcRes.status);
    }

    const result = await simulationService.resetMachine(machineId);
    return jsonResponse(result, 200);
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
      endpoint: '/api/simulations/reset',
      machineId,
    });
    return errorResponse(
      'INTERNAL_ERROR',
      `Simulation reset failed: ${error.message}`,
      500
    );
  }
}
