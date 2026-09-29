/**
 * FactoryGuard Baseline Operating Bands & Anomaly Thresholds
 * Authoritative values defined in REQUIREMENTS.md (FR-05)
 *
 * Centralized here to avoid scattering thresholds throughout UI or API code.
 */

export interface MetricThresholds {
  normalMin: number;
  normalMax: number;
  warningMax: number;
  unit: string;
}

export const THRESHOLDS = {
  temperature: {
    normalMin: 45,
    normalMax: 70,
    warningMax: 90,
    unit: '°C',
  },
  vibration: {
    normalMin: 0,
    normalMax: 6,
    warningMax: 10,
    unit: 'mm/s',
  },
  pressure: {
    normalMin: 90,
    normalMax: 110,
    warningMax: 118,
    unit: 'PSI',
  },
} as const;

export type MetricLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export function evaluateMetric(
  metric: 'temperature' | 'vibration' | 'pressure',
  value: number
): MetricLevel {
  const t = THRESHOLDS[metric];
  if (metric === 'vibration') {
    if (value <= t.normalMax) return 'NORMAL';
    if (value <= t.warningMax) return 'WARNING';
    return 'CRITICAL';
  }

  // temperature and pressure have lower and upper normal bands
  if (value >= t.normalMin && value <= t.normalMax) {
    return 'NORMAL';
  }
  if (value > t.normalMax && value <= t.warningMax) {
    return 'WARNING';
  }
  if (value > t.warningMax) {
    return 'CRITICAL';
  }
  // If slightly below normalMin, flag warning or normal (e.g. low pressure or cold start)
  if (value < t.normalMin) {
    return 'WARNING';
  }
  return 'NORMAL';
}
