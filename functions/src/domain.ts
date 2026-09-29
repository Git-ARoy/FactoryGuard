/**
 * FactoryGuard Domain Logic for Azure Functions
 */

export type MachineStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type SimulationScenario = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'RECOVERY';
export type IncidentSeverity = 'WARNING' | 'CRITICAL';
export type IncidentType = 'TEMPERATURE' | 'VIBRATION' | 'PRESSURE' | 'MULTI_SIGNAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface TelemetrySnapshot {
  temperatureC: number;
  vibrationMmS: number;
  pressurePsi: number;
}

export const THRESHOLDS = {
  temperature: { normalMin: 45, normalMax: 70, warningMax: 90 },
  vibration: { normalMin: 0, normalMax: 6, warningMax: 10 },
  pressure: { normalMin: 90, normalMax: 110, warningMax: 118 },
} as const;

export function evaluateMetric(
  metric: 'temperature' | 'vibration' | 'pressure',
  value: number
): 'NORMAL' | 'WARNING' | 'CRITICAL' {
  const t = THRESHOLDS[metric];
  if (metric === 'vibration') {
    if (value <= t.normalMax) return 'NORMAL';
    if (value <= t.warningMax) return 'WARNING';
    return 'CRITICAL';
  }
  if (value >= t.normalMin && value <= t.normalMax) return 'NORMAL';
  if (value > t.normalMax && value <= t.warningMax) return 'WARNING';
  if (value > t.warningMax) return 'CRITICAL';
  if (value < t.normalMin) return 'WARNING';
  return 'NORMAL';
}

export function calculateHealthScore(
  snapshot: TelemetrySnapshot,
  status: MachineStatus
): number {
  const { temperatureC, vibrationMmS, pressurePsi } = snapshot;
  let penalty = 0;

  if (temperatureC > THRESHOLDS.temperature.normalMax) {
    penalty += Math.min((temperatureC - THRESHOLDS.temperature.normalMax) * 1.5, 30);
  }
  if (vibrationMmS > THRESHOLDS.vibration.normalMax) {
    penalty += Math.min((vibrationMmS - THRESHOLDS.vibration.normalMax) * 5, 35);
  }
  if (pressurePsi > THRESHOLDS.pressure.normalMax) {
    penalty += Math.min((pressurePsi - THRESHOLDS.pressure.normalMax) * 2.5, 30);
  }

  if (status === 'NORMAL') {
    return Math.max(82, Math.min(99, Math.round(100 - penalty * 0.5)));
  }
  if (status === 'WARNING') {
    return Math.max(52, Math.min(78, Math.round(75 - penalty * 0.4)));
  }
  return Math.max(12, Math.min(48, Math.round(45 - penalty * 0.4)));
}

export function evaluateTelemetry(snapshot: TelemetrySnapshot) {
  const tempLevel = evaluateMetric('temperature', snapshot.temperatureC);
  const vibLevel = evaluateMetric('vibration', snapshot.vibrationMmS);
  const pressLevel = evaluateMetric('pressure', snapshot.pressurePsi);

  const criticalCount = [tempLevel, vibLevel, pressLevel].filter((l) => l === 'CRITICAL').length;
  const warningCount = [tempLevel, vibLevel, pressLevel].filter((l) => l === 'WARNING').length;

  if (criticalCount > 0 || warningCount >= 3) {
    const isMulti = warningCount >= 3 || criticalCount >= 2;
    let incidentType: IncidentType = 'MULTI_SIGNAL';
    if (!isMulti) {
      if (tempLevel === 'CRITICAL') incidentType = 'TEMPERATURE';
      else if (vibLevel === 'CRITICAL') incidentType = 'VIBRATION';
      else if (pressLevel === 'CRITICAL') incidentType = 'PRESSURE';
    }

    const title =
      incidentType === 'MULTI_SIGNAL'
        ? 'Severe Multi-Signal Operating Anomaly'
        : `Critical ${incidentType} Anomaly Detected`;

    const description =
      incidentType === 'MULTI_SIGNAL'
        ? `Multiple operating metrics exceeded critical operating bands concurrently.`
        : `Primary operating parameter exceeded critical safety thresholds.`;

    return {
      status: 'CRITICAL' as MachineStatus,
      healthScore: calculateHealthScore(snapshot, 'CRITICAL'),
      anomalyDetected: true,
      severity: 'CRITICAL' as IncidentSeverity,
      incidentType,
      title,
      description,
    };
  }

  if (warningCount > 0) {
    let incidentType: IncidentType = 'MULTI_SIGNAL';
    if (warningCount === 1) {
      if (vibLevel === 'WARNING') incidentType = 'VIBRATION';
      else if (tempLevel === 'WARNING') incidentType = 'TEMPERATURE';
      else if (pressLevel === 'WARNING') incidentType = 'PRESSURE';
    } else {
      incidentType = vibLevel === 'WARNING' ? 'VIBRATION' : 'MULTI_SIGNAL';
    }

    const title = `Elevated ${incidentType} Warning`;
    const description = `Operating parameter exceeded normal baseline tolerance.`;

    return {
      status: 'WARNING' as MachineStatus,
      healthScore: calculateHealthScore(snapshot, 'WARNING'),
      anomalyDetected: true,
      severity: 'WARNING' as IncidentSeverity,
      incidentType,
      title,
      description,
    };
  }

  return {
    status: 'NORMAL' as MachineStatus,
    healthScore: calculateHealthScore(snapshot, 'NORMAL'),
    anomalyDetected: false,
  };
}

export const SCENARIO_READINGS: Record<SimulationScenario, TelemetrySnapshot> = {
  NORMAL: { temperatureC: 58.4, vibrationMmS: 2.3, pressurePsi: 102.5 },
  WARNING: { temperatureC: 78.5, vibrationMmS: 7.4, pressurePsi: 106.8 },
  CRITICAL: { temperatureC: 96.2, vibrationMmS: 11.6, pressurePsi: 119.5 },
  RECOVERY: { temperatureC: 54.0, vibrationMmS: 1.8, pressurePsi: 99.2 },
};
