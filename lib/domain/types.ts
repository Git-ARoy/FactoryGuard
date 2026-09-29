/**
 * FactoryGuard Domain Model Types
 * Authoritative schema defined in ARCHITECTURE.md and API_SPEC.md
 */

export type MachineStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface Machine {
  id: string;
  name: string;
  machineType: string;
  line: string;
  location: string;
  status: MachineStatus;
  healthScore: number;
  lastTelemetryAt: string;
  operatingHours?: number;
  maintenanceDueAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SimulationScenario = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'RECOVERY';

export interface TelemetryEvent {
  id: string;
  machineId: string;
  timestamp: string;
  temperatureC: number;
  vibrationMmS: number;
  pressurePsi: number;
  operatingHours: number;
  scenario: SimulationScenario;
  source: 'simulator';
}

export type IncidentSeverity = 'WARNING' | 'CRITICAL';
export type IncidentType = 'TEMPERATURE' | 'VIBRATION' | 'PRESSURE' | 'MULTI_SIGNAL';
export type IncidentStatus = 'OPEN' | 'RESOLVED';

export interface TelemetrySnapshot {
  temperatureC: number;
  vibrationMmS: number;
  pressurePsi: number;
}

export interface Incident {
  id: string;
  machineId: string;
  severity: IncidentSeverity;
  type: IncidentType;
  title: string;
  description: string;
  status: IncidentStatus;
  detectedAt: string;
  resolvedAt?: string | null;
  triggerTelemetryId: string;
  telemetrySnapshot: TelemetrySnapshot;
}

export type DocumentCategory = 'MANUAL' | 'MAINTENANCE' | 'INSPECTION' | 'REPORT';

export interface DocumentMetadata {
  id: string;
  machineId?: string;
  name: string;
  category: DocumentCategory;
  blobName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface PlantSummary {
  machineCount: number;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  activeIncidentCount: number;
  healthScore: number;
}

export interface DashboardSummaryResponse {
  plant: PlantSummary;
  recentIncidents: Incident[];
  generatedAt: string;
}

export interface MachineDetailResponse {
  machine: Machine;
  latestTelemetry?: TelemetryEvent;
  activeIncidents: Incident[];
  documents: DocumentMetadata[];
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  limit: number;
}

export interface SimulationEventResult {
  success: boolean;
  scenario: SimulationScenario;
  machine: {
    id: string;
    status: MachineStatus;
    healthScore: number;
  };
  telemetry: {
    id: string;
    temperatureC: number;
    vibrationMmS: number;
    pressurePsi: number;
    scenario: SimulationScenario;
    source: 'simulator';
  };
  incident?: {
    id: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
  } | null;
}

export interface SimulationResetResult {
  success: boolean;
  machineId: string;
  status: 'NORMAL';
  resolvedIncidentIds: string[];
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown;
  };
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  dependencies: {
    cosmos: 'ok' | 'error';
    storage: 'ok' | 'error';
  };
}
