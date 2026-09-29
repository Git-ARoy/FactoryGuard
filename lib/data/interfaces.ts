import {
  Machine,
  MachineStatus,
  TelemetryEvent,
  Incident,
  IncidentStatus,
  IncidentSeverity,
  IncidentType,
  DocumentMetadata,
  DocumentCategory,
} from '../domain/types';

export interface MachineFilters {
  status?: MachineStatus;
  line?: string;
  search?: string;
  limit?: number;
}

export interface IMachineRepository {
  getAll(filters?: MachineFilters): Promise<Machine[]>;
  getById(id: string): Promise<Machine | null>;
  update(machine: Machine): Promise<Machine>;
  updateStatus(
    id: string,
    status: MachineStatus,
    healthScore: number,
    lastTelemetryAt: string
  ): Promise<Machine>;
}

export interface TelemetryFilters {
  limit?: number;
  from?: string;
  to?: string;
}

export interface ITelemetryRepository {
  record(event: TelemetryEvent): Promise<TelemetryEvent>;
  getHistory(machineId: string, filters?: TelemetryFilters): Promise<TelemetryEvent[]>;
  getLatest(machineId: string): Promise<TelemetryEvent | null>;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  machineId?: string;
  limit?: number;
}

export interface IIncidentRepository {
  getAll(filters?: IncidentFilters): Promise<Incident[]>;
  getById(id: string): Promise<Incident | null>;
  findActiveByMachine(machineId: string): Promise<Incident[]>;
  findActiveByMachineAndType(
    machineId: string,
    type: IncidentType
  ): Promise<Incident | null>;
  create(incident: Incident): Promise<Incident>;
  update(incident: Incident): Promise<Incident>;
  resolve(id: string, resolvedAt?: string): Promise<Incident | null>;
  resolveActiveForMachine(machineId: string): Promise<string[]>;
}

export interface DocumentFilters {
  machineId?: string;
  category?: DocumentCategory;
}

export interface IDocumentRepository {
  getAll(filters?: DocumentFilters): Promise<DocumentMetadata[]>;
  getById(id: string): Promise<DocumentMetadata | null>;
  create(doc: DocumentMetadata): Promise<DocumentMetadata>;
}
