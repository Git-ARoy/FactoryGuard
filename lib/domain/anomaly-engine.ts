import { evaluateMetric, THRESHOLDS } from './thresholds';
import {
  MachineStatus,
  IncidentSeverity,
  IncidentType,
  TelemetrySnapshot,
} from './types';

export interface AnomalyEvaluationResult {
  status: MachineStatus;
  healthScore: number;
  anomalyDetected: boolean;
  severity?: IncidentSeverity;
  incidentType?: IncidentType;
  title?: string;
  description?: string;
  metricLevels: {
    temperature: 'NORMAL' | 'WARNING' | 'CRITICAL';
    vibration: 'NORMAL' | 'WARNING' | 'CRITICAL';
    pressure: 'NORMAL' | 'WARNING' | 'CRITICAL';
  };
}

/**
 * Calculates a deterministic health score (0-100) based on metric values and status.
 * FR-06:
 * - Normal: 80-100
 * - Warning: 50-79
 * - Critical: 0-49
 */
export function calculateHealthScore(
  snapshot: TelemetrySnapshot,
  status: MachineStatus
): number {
  const { temperatureC, vibrationMmS, pressurePsi } = snapshot;

  // Compute normalized penalty points
  let penalty = 0;

  // Temperature penalty
  if (temperatureC > THRESHOLDS.temperature.normalMax) {
    const excess = temperatureC - THRESHOLDS.temperature.normalMax;
    penalty += Math.min(excess * 1.5, 30);
  } else if (temperatureC < THRESHOLDS.temperature.normalMin) {
    penalty += Math.min((THRESHOLDS.temperature.normalMin - temperatureC) * 0.8, 15);
  }

  // Vibration penalty
  if (vibrationMmS > THRESHOLDS.vibration.normalMax) {
    const excess = vibrationMmS - THRESHOLDS.vibration.normalMax;
    penalty += Math.min(excess * 5, 35);
  }

  // Pressure penalty
  if (pressurePsi > THRESHOLDS.pressure.normalMax) {
    const excess = pressurePsi - THRESHOLDS.pressure.normalMax;
    penalty += Math.min(excess * 2.5, 30);
  } else if (pressurePsi < THRESHOLDS.pressure.normalMin) {
    penalty += Math.min((THRESHOLDS.pressure.normalMin - pressurePsi) * 1.5, 20);
  }

  if (status === 'NORMAL') {
    const raw = 100 - penalty * 0.5;
    return Math.max(82, Math.min(99, Math.round(raw)));
  }

  if (status === 'WARNING') {
    const raw = 75 - penalty * 0.4;
    return Math.max(52, Math.min(78, Math.round(raw)));
  }

  // CRITICAL
  const raw = 45 - penalty * 0.4;
  return Math.max(12, Math.min(48, Math.round(raw)));
}

/**
 * Evaluates telemetry snapshot against deterministic threshold rules (FR-05).
 */
export function evaluateTelemetry(
  snapshot: TelemetrySnapshot
): AnomalyEvaluationResult {
  const tempLevel = evaluateMetric('temperature', snapshot.temperatureC);
  const vibLevel = evaluateMetric('vibration', snapshot.vibrationMmS);
  const pressLevel = evaluateMetric('pressure', snapshot.pressurePsi);

  const metricLevels = {
    temperature: tempLevel,
    vibration: vibLevel,
    pressure: pressLevel,
  };

  const criticalCount = [tempLevel, vibLevel, pressLevel].filter(
    (l) => l === 'CRITICAL'
  ).length;
  const warningCount = [tempLevel, vibLevel, pressLevel].filter(
    (l) => l === 'WARNING'
  ).length;

  // Rule: Critical when at least one critical threshold is crossed (or all 3 warning)
  if (criticalCount > 0 || warningCount >= 3) {
    const isMultiSignal = criticalCount >= 2 || warningCount >= 3;
    let incidentType: IncidentType = 'MULTI_SIGNAL';

    if (!isMultiSignal) {
      if (tempLevel === 'CRITICAL') incidentType = 'TEMPERATURE';
      else if (vibLevel === 'CRITICAL') incidentType = 'VIBRATION';
      else if (pressLevel === 'CRITICAL') incidentType = 'PRESSURE';
    }

    const title = getIncidentTitle('CRITICAL', incidentType, snapshot);
    const description = getIncidentDescription('CRITICAL', incidentType, snapshot);

    const healthScore = calculateHealthScore(snapshot, 'CRITICAL');

    return {
      status: 'CRITICAL',
      healthScore,
      anomalyDetected: true,
      severity: 'CRITICAL',
      incidentType,
      title,
      description,
      metricLevels,
    };
  }

  // Rule: Warning when one or more warning thresholds are crossed and no critical threshold is crossed (REQUIREMENTS.md FR-05)
  if (warningCount > 0) {
    let incidentType: IncidentType = 'MULTI_SIGNAL';
    if (warningCount === 1) {
      if (vibLevel === 'WARNING') incidentType = 'VIBRATION';
      else if (tempLevel === 'WARNING') incidentType = 'TEMPERATURE';
      else if (pressLevel === 'WARNING') incidentType = 'PRESSURE';
    } else {
      // If vibration is elevated, prioritize vibration for industrial machining or multi-signal
      incidentType = vibLevel === 'WARNING' ? 'VIBRATION' : 'MULTI_SIGNAL';
    }

    const title = getIncidentTitle('WARNING', incidentType, snapshot);
    const description = getIncidentDescription('WARNING', incidentType, snapshot);
    const healthScore = calculateHealthScore(snapshot, 'WARNING');

    return {
      status: 'WARNING',
      healthScore,
      anomalyDetected: true,
      severity: 'WARNING',
      incidentType,
      title,
      description,
      metricLevels,
    };
  }

  // Otherwise NORMAL
  const healthScore = calculateHealthScore(snapshot, 'NORMAL');
  return {
    status: 'NORMAL',
    healthScore,
    anomalyDetected: false,
    metricLevels,
  };
}

function getIncidentTitle(
  severity: IncidentSeverity,
  type: IncidentType,
  snapshot: TelemetrySnapshot
): string {
  if (type === 'MULTI_SIGNAL') {
    return severity === 'CRITICAL'
      ? 'Severe Multi-Signal Operating Anomaly'
      : 'Compounded Warning Conditions Detected';
  }
  switch (type) {
    case 'TEMPERATURE':
      return severity === 'CRITICAL'
        ? `Thermal Overrun Alert (${snapshot.temperatureC}°C)`
        : `Elevated Operating Temperature (${snapshot.temperatureC}°C)`;
    case 'VIBRATION':
      return severity === 'CRITICAL'
        ? `Severe Mechanical Vibration (${snapshot.vibrationMmS} mm/s)`
        : `Abnormal Vibration Level (${snapshot.vibrationMmS} mm/s)`;
    case 'PRESSURE':
      return severity === 'CRITICAL'
        ? `Hydraulic/Pneumatic Overpressure (${snapshot.pressurePsi} PSI)`
        : `Elevated Hydraulic Pressure (${snapshot.pressurePsi} PSI)`;
  }
}

function getIncidentDescription(
  severity: IncidentSeverity,
  type: IncidentType,
  snapshot: TelemetrySnapshot
): string {
  if (type === 'MULTI_SIGNAL') {
    return `Multiple operating parameters exceeded baseline tolerances concurrently: Temperature: ${snapshot.temperatureC}°C, Vibration: ${snapshot.vibrationMmS} mm/s, Pressure: ${snapshot.pressurePsi} PSI. Immediate inspection recommended.`;
  }
  switch (type) {
    case 'TEMPERATURE':
      return `Operating temperature (${snapshot.temperatureC}°C) exceeded the ${severity.toLowerCase()} operating threshold (${THRESHOLDS.temperature.normalMax}°C). Indicates potential cooling system failure or severe friction.`;
    case 'VIBRATION':
      return `Machine vibration reached ${snapshot.vibrationMmS} mm/s, exceeding normal tolerance (${THRESHOLDS.vibration.normalMax} mm/s). Indicates mechanical imbalance, bearing wear, or structural resonance.`;
    case 'PRESSURE':
      return `Operating pressure measured ${snapshot.pressurePsi} PSI, crossing the ${severity.toLowerCase()} boundary (${THRESHOLDS.pressure.normalMax} PSI). Check fluid manifolds and pressure relief valves.`;
  }
}
