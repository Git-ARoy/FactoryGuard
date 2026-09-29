import { describe, it, expect } from 'vitest';
import {
  generateSimulationTelemetry,
  SCENARIO_READINGS,
} from '../../lib/domain/simulation-engine';

describe('FactoryGuard Simulation Engine', () => {
  it('generates deterministic normal telemetry readings', () => {
    const reading = generateSimulationTelemetry('CNC-02', 'NORMAL', 2500);

    expect(reading.machineId).toBe('CNC-02');
    expect(reading.scenario).toBe('NORMAL');
    expect(reading.source).toBe('simulator');
    expect(reading.operatingHours).toBe(2500);
    expect(reading.temperatureC).toBe(SCENARIO_READINGS.NORMAL.temperatureC);
    expect(reading.vibrationMmS).toBe(SCENARIO_READINGS.NORMAL.vibrationMmS);
    expect(reading.pressurePsi).toBe(SCENARIO_READINGS.NORMAL.pressurePsi);
    expect(new Date(reading.timestamp).getTime()).not.toBeNaN();
  });

  it('generates deterministic warning telemetry readings', () => {
    const reading = generateSimulationTelemetry('CNC-02', 'WARNING');

    expect(reading.scenario).toBe('WARNING');
    expect(reading.temperatureC).toBe(78.5);
    expect(reading.vibrationMmS).toBe(7.4);
    expect(reading.pressurePsi).toBe(106.8);
  });

  it('generates deterministic critical telemetry readings', () => {
    const reading = generateSimulationTelemetry('CNC-02', 'CRITICAL');

    expect(reading.scenario).toBe('CRITICAL');
    expect(reading.temperatureC).toBe(96.2);
    expect(reading.vibrationMmS).toBe(11.6);
    expect(reading.pressurePsi).toBe(119.5);
  });

  it('generates deterministic recovery telemetry readings', () => {
    const reading = generateSimulationTelemetry('CNC-02', 'RECOVERY');

    expect(reading.scenario).toBe('RECOVERY');
    expect(reading.temperatureC).toBe(54.0);
    expect(reading.vibrationMmS).toBe(1.8);
    expect(reading.pressurePsi).toBe(99.2);
  });
});
