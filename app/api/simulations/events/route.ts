import { NextRequest } from 'next/server';
import { jsonResponse, errorResponse } from '@/lib/api-client/response';
import { simulationService } from '@/lib/services/simulation.service';
import { SimulationScenario } from '@/lib/domain/types';
import { config } from '@/lib/config/env';
import { TelemetryLogger } from '@/lib/observability';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { machineId?: string; scenario?: string };

  try {
    body = await req.json();
  } catch {
    return errorResponse(
      'INVALID_REQUEST',
      'Request body must be valid JSON',
      400
    );
  }

  const { machineId, scenario } = body;

  if (!machineId) {
    return errorResponse('INVALID_REQUEST', 'machineId is required', 400);
  }

  const allowedScenarios: SimulationScenario[] = [
    'NORMAL',
    'WARNING',
    'CRITICAL',
    'RECOVERY',
  ];
  if (!scenario || !allowedScenarios.includes(scenario as SimulationScenario)) {
    return errorResponse(
      'INVALID_SCENARIO',
      'scenario must be NORMAL, WARNING, CRITICAL, or RECOVERY',
      400
    );
  }

  try {
    // If Azure Functions backend is configured, forward to Functions endpoint
    if (config.functions.isConfigured) {
      const functionUrl = `${config.functions.baseUrl}/api/simulations/events`;
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (config.functions.internalSecret) {
          headers['x-functions-key'] = config.functions.internalSecret;
        }

        const funcRes = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ machineId, scenario }),
        });

        const funcData = await funcRes.json();
        return jsonResponse(funcData, funcRes.status);
      } catch (funcErr) {
        console.warn('Azure Function call failed, falling back to local service execution', funcErr);
      }
    }

    // Direct domain service execution
    const result = await simulationService.triggerEvent(
      machineId,
      scenario as SimulationScenario
    );

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
      endpoint: '/api/simulations/events',
      machineId,
      scenario,
    });
    return errorResponse(
      'INTERNAL_ERROR',
      `Simulation processing failed: ${error.message}`,
      500
    );
  }
}
