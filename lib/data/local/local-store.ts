import {
  Machine,
  TelemetryEvent,
  Incident,
  DocumentMetadata,
} from '../../domain/types';

import seedMachines from '../../../data/seed/machines.json';
import seedTelemetry from '../../../data/seed/telemetry.json';
import seedIncidents from '../../../data/seed/incidents.json';
import seedDocuments from '../../../data/seed/documents.json';

/**
 * Singleton in-memory store initialized with realistic seed data.
 * Used for zero-dependency local development and testing.
 */
class LocalDataStore {
  private machines: Map<string, Machine> = new Map();
  private telemetry: TelemetryEvent[] = [];
  private incidents: Map<string, Incident> = new Map();
  private documents: Map<string, DocumentMetadata> = new Map();
  private initialized = false;

  constructor() {
    this.resetToSeed();
  }

  public resetToSeed(): void {
    this.machines.clear();
    for (const m of seedMachines) {
      this.machines.set(m.id, { ...(m as Machine) });
    }

    this.telemetry = seedTelemetry.map((t) => ({ ...(t as TelemetryEvent) }));

    this.incidents.clear();
    for (const inc of seedIncidents) {
      this.incidents.set(inc.id, { ...(inc as Incident) });
    }

    this.documents.clear();
    for (const doc of seedDocuments) {
      this.documents.set(doc.id, { ...(doc as DocumentMetadata) });
    }

    this.initialized = true;
  }

  public getMachines(): Machine[] {
    return Array.from(this.machines.values());
  }

  public getMachine(id: string): Machine | null {
    return this.machines.get(id) || null;
  }

  public saveMachine(machine: Machine): Machine {
    this.machines.set(machine.id, { ...machine });
    return machine;
  }

  public getTelemetry(): TelemetryEvent[] {
    return [...this.telemetry];
  }

  public addTelemetry(event: TelemetryEvent): TelemetryEvent {
    this.telemetry.unshift({ ...event });
    return event;
  }

  public getIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  public getIncident(id: string): Incident | null {
    return this.incidents.get(id) || null;
  }

  public saveIncident(incident: Incident): Incident {
    this.incidents.set(incident.id, { ...incident });
    return incident;
  }

  public getDocuments(): DocumentMetadata[] {
    return Array.from(this.documents.values());
  }

  public getDocument(id: string): DocumentMetadata | null {
    return this.documents.get(id) || null;
  }

  public saveDocument(doc: DocumentMetadata): DocumentMetadata {
    this.documents.set(doc.id, { ...doc });
    return doc;
  }
}

// Global singleton instance preserved in Node/Next.js memory
const globalForStore = globalThis as unknown as { localDataStore?: LocalDataStore };
export const localStore = globalForStore.localDataStore || new LocalDataStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.localDataStore = localStore;
}
