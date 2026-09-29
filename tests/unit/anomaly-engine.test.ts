import { describe, it, expect } from 'vitest';
import {
  evaluateTelemetry,
  calculateHealthScore,
} from '../../lib/domain/anomaly-engine';
import { evaluateMetric, THRESHOLDS } from '../../lib/domain/thresholds';

describe('FactoryGuard Anomaly Engine & Thresholds', () => {
  it('correctly evaluates individual metrics according to operating bands', () => {
    // Temperature: Normal 45-70, Warning 70-90, Critical >90
    expect(evaluateMetric('temperature', 55)).toBe('NORMAL');
    expect(evaluateMetric('temperature', 70)).toBe('NORMAL');
    expect(evaluateMetric('temperature', 78)).toBe('WARNING');
    expect(evaluateMetric('temperature', 90)).toBe('WARNING');
    expect(evaluateMetric('temperature', 95)).toBe('CRITICAL');

    // Vibration: Normal 0-6, Warning 6-10, Critical >10
    expect(evaluateMetric('vibration', 2.1)).toBe('NORMAL');
    expect(evaluateMetric('vibration', 6.0)).toBe('NORMAL');
    expect(evaluateMetric('vibration', 7.5)).toBe('WARNING');
    expect(evaluateMetric('vibration', 10.0)).toBe('WARNING');
    expect(evaluateMetric('vibration', 11.8)).toBe('CRITICAL');

    // Pressure: Normal 90-110, Warning 110-118, Critical >118
    expect(evaluateMetric('pressure', 100)).toBe('NORMAL');
    expect(evaluateMetric('pressure', 110)).toBe('NORMAL');
    expect(evaluateMetric('pressure', 114)).toBe('WARNING');
    expect(evaluateMetric('pressure', 118)).toBe('WARNING');
    expect(evaluateMetric('pressure', 122)).toBe('CRITICAL');
  });

  it('evaluates completely normal telemetry as NORMAL with high health score', () => {
    const result = evaluateTelemetry({
      temperatureC: 58.4,
      vibrationMmS: 2.3,
      pressurePsi: 102.5,
    });

    expect(result.status).toBe('NORMAL');
    expect(result.anomalyDetected).toBe(false);
    expect(result.healthScore).toBeGreaterThanOrEqual(80);
    expect(result.healthScore).toBeLessThanOrEqual(100);
    expect(result.metricLevels.temperature).toBe('NORMAL');
    expect(result.metricLevels.vibration).toBe('NORMAL');
    expect(result.metricLevels.pressure).toBe('NORMAL');
  });

  it('evaluates single elevated metric as WARNING with warning severity and score 50-79', () => {
    // Elevated vibration only
    const result = evaluateTelemetry({
      temperatureC: 62.0, // normal
      vibrationMmS: 7.4,  // warning (>6 to 10)
      pressurePsi: 104.0, // normal
    });

    expect(result.status).toBe('WARNING');
    expect(result.anomalyDetected).toBe(true);
    expect(result.severity).toBe('WARNING');
    expect(result.incidentType).toBe('VIBRATION');
    expect(result.healthScore).toBeGreaterThanOrEqual(50);
    expect(result.healthScore).toBeLessThanOrEqual(79);
    expect(result.title).toContain('Vibration');
  });

  it('evaluates single critical metric as CRITICAL with score 0-49', () => {
    // Critical temperature only
    const result = evaluateTelemetry({
      temperatureC: 96.0, // critical (>90)
      vibrationMmS: 3.5,  // normal
      pressurePsi: 105.0, // normal
    });

    expect(result.status).toBe('CRITICAL');
    expect(result.anomalyDetected).toBe(true);
    expect(result.severity).toBe('CRITICAL');
    expect(result.incidentType).toBe('TEMPERATURE');
    expect(result.healthScore).toBeGreaterThanOrEqual(0);
    expect(result.healthScore).toBeLessThanOrEqual(49);
    expect(result.title).toContain('Thermal Overrun');
  });

  it('evaluates multiple warning metrics as WARNING when no critical thresholds are crossed', () => {
    // Both temperature and vibration in warning
    const result = evaluateTelemetry({
      temperatureC: 78.0, // warning (>70)
      vibrationMmS: 7.5,  // warning (>6.0)
      pressurePsi: 105.0, // normal
    });

    expect(result.status).toBe('WARNING');
    expect(result.anomalyDetected).toBe(true);
    expect(result.severity).toBe('WARNING');
    expect(result.healthScore).toBeGreaterThanOrEqual(50);
    expect(result.healthScore).toBeLessThanOrEqual(79);
  });

  it('compound severe rule: triggers CRITICAL with MULTI_SIGNAL when all 3 metrics are in WARNING', () => {
    // Temp, vibration, and pressure all in warning
    const result = evaluateTelemetry({
      temperatureC: 85.0, // warning
      vibrationMmS: 8.5,  // warning
      pressurePsi: 115.0, // warning
    });

    expect(result.status).toBe('CRITICAL');
    expect(result.anomalyDetected).toBe(true);
    expect(result.severity).toBe('CRITICAL');
    expect(result.incidentType).toBe('MULTI_SIGNAL');
    expect(result.healthScore).toBeLessThanOrEqual(49);
    expect(result.title).toContain('Multi-Signal');
  });
});
