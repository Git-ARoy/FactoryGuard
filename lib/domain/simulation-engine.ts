import { SimulationScenario, TelemetryEvent, TelemetrySnapshot } from './types';

/**
 * Deterministic telemetry generator for workshop scenarios (FR-08, API_SPEC Section 9).
 * Ensures 100% repeatable workshop demonstrations for normal, warning, critical, and recovery.
 */
export const SCENARIO_READINGS: Record<SimulationScenario, TelemetrySnapshot> = {
  NORMAL: {
    temperatureC: 58.4,
    vibrationMmS: 2.3,
    pressurePsi: 102.5,
  },
  WARNING: {
    temperatureC: 78.5,
    vibrationMmS: 7.4,
    pressurePsi: 106.8,
  },
  CRITICAL: {
    temperatureC: 96.2,
    vibrationMmS: 11.6,
    pressurePsi: 119.5,
  },
  RECOVERY: {
    temperatureC: 54.0,
    vibrationMmS: 1.8,
    pressurePsi: 99.2,
  },
};

export function generateSimulationTelemetry(
  machineId: string,
  scenario: SimulationScenario,
  operatingHours = 1850
): TelemetryEvent {
  const snapshot = SCENARIO_READINGS[scenario];
  const now = new Date().toISOString();
  const id = `tel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    machineId,
    timestamp: now,
    temperatureC: snapshot.temperatureC,
    vibrationMmS: snapshot.vibrationMmS,
    pressurePsi: snapshot.pressurePsi,
    operatingHours,
    scenario,
    source: 'simulator',
  };
}
