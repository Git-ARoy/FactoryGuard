import {
  IMachineRepository,
  MachineFilters,
  ITelemetryRepository,
  TelemetryFilters,
  IIncidentRepository,
  IncidentFilters,
  IDocumentRepository,
  DocumentFilters,
} from '../interfaces';
import {
  Machine,
  MachineStatus,
  TelemetryEvent,
  Incident,
  IncidentType,
  DocumentMetadata,
} from '../../domain/types';
import { localStore } from './local-store';

export class LocalMachineRepository implements IMachineRepository {
  async getAll(filters?: MachineFilters): Promise<Machine[]> {
    let items = localStore.getMachines();

    if (filters?.status) {
      items = items.filter((m) => m.status === filters.status);
    }
    if (filters?.line) {
      const lineLower = filters.line.toLowerCase();
      items = items.filter((m) => m.line.toLowerCase().includes(lineLower));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          m.machineType.toLowerCase().includes(q)
      );
    }
    if (filters?.limit && filters.limit > 0) {
      items = items.slice(0, filters.limit);
    }

    return items;
  }

  async getById(id: string): Promise<Machine | null> {
    return localStore.getMachine(id);
  }

  async update(machine: Machine): Promise<Machine> {
    return localStore.saveMachine({
      ...machine,
      updatedAt: new Date().toISOString(),
    });
  }

  async updateStatus(
    id: string,
    status: MachineStatus,
    healthScore: number,
    lastTelemetryAt: string
  ): Promise<Machine> {
    const existing = localStore.getMachine(id);
    if (!existing) {
      throw new Error(`Machine ${id} not found`);
    }

    const updated: Machine = {
      ...existing,
      status,
      healthScore,
      lastTelemetryAt,
      updatedAt: new Date().toISOString(),
    };

    return localStore.saveMachine(updated);
  }
}

export class LocalTelemetryRepository implements ITelemetryRepository {
  async record(event: TelemetryEvent): Promise<TelemetryEvent> {
    return localStore.addTelemetry(event);
  }

  async getHistory(
    machineId: string,
    filters?: TelemetryFilters
  ): Promise<TelemetryEvent[]> {
    let list = localStore
      .getTelemetry()
      .filter((t) => t.machineId === machineId);

    if (filters?.from) {
      const fromTime = new Date(filters.from).getTime();
      list = list.filter((t) => new Date(t.timestamp).getTime() >= fromTime);
    }
    if (filters?.to) {
      const toTime = new Date(filters.to).getTime();
      list = list.filter((t) => new Date(t.timestamp).getTime() <= toTime);
    }

    // Sort descending by timestamp
    list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limit = Math.min(filters?.limit || 20, 100);
    return list.slice(0, limit);
  }

  async getLatest(machineId: string): Promise<TelemetryEvent | null> {
    const history = await this.getHistory(machineId, { limit: 1 });
    return history[0] || null;
  }
}

export class LocalIncidentRepository implements IIncidentRepository {
  async getAll(filters?: IncidentFilters): Promise<Incident[]> {
    let items = localStore.getIncidents();

    if (filters?.status) {
      items = items.filter((inc) => inc.status === filters.status);
    }
    if (filters?.severity) {
      items = items.filter((inc) => inc.severity === filters.severity);
    }
    if (filters?.machineId) {
      items = items.filter((inc) => inc.machineId === filters.machineId);
    }

    // Sort by detectedAt descending
    items.sort(
      (a, b) =>
        new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );

    const limit = Math.min(filters?.limit || 25, 100);
    return items.slice(0, limit);
  }

  async getById(id: string): Promise<Incident | null> {
    return localStore.getIncident(id);
  }

  async findActiveByMachine(machineId: string): Promise<Incident[]> {
    return localStore
      .getIncidents()
      .filter((inc) => inc.machineId === machineId && inc.status === 'OPEN');
  }

  async findActiveByMachineAndType(
    machineId: string,
    type: IncidentType
  ): Promise<Incident | null> {
    const found = localStore
      .getIncidents()
      .find(
        (inc) =>
          inc.machineId === machineId &&
          inc.type === type &&
          inc.status === 'OPEN'
      );
    return found || null;
  }

  async create(incident: Incident): Promise<Incident> {
    return localStore.saveIncident(incident);
  }

  async update(incident: Incident): Promise<Incident> {
    return localStore.saveIncident(incident);
  }

  async resolve(id: string, resolvedAt?: string): Promise<Incident | null> {
    const existing = localStore.getIncident(id);
    if (!existing) return null;

    const resolved: Incident = {
      ...existing,
      status: 'RESOLVED',
      resolvedAt: resolvedAt || new Date().toISOString(),
    };
    return localStore.saveIncident(resolved);
  }

  async resolveActiveForMachine(machineId: string): Promise<string[]> {
    const openIncidents = await this.findActiveByMachine(machineId);
    const resolvedIds: string[] = [];
    const now = new Date().toISOString();

    for (const inc of openIncidents) {
      const resolved: Incident = {
        ...inc,
        status: 'RESOLVED',
        resolvedAt: now,
      };
      localStore.saveIncident(resolved);
      resolvedIds.push(inc.id);
    }

    return resolvedIds;
  }
}

export class LocalDocumentRepository implements IDocumentRepository {
  async getAll(filters?: DocumentFilters): Promise<DocumentMetadata[]> {
    let items = localStore.getDocuments();

    if (filters?.machineId) {
      items = items.filter((d) => d.machineId === filters.machineId);
    }
    if (filters?.category) {
      items = items.filter((d) => d.category === filters.category);
    }

    return items;
  }

  async getById(id: string): Promise<DocumentMetadata | null> {
    return localStore.getDocument(id);
  }

  async create(doc: DocumentMetadata): Promise<DocumentMetadata> {
    return localStore.saveDocument(doc);
  }
}
