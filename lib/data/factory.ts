import { config } from '../config/env';
import {
  IMachineRepository,
  ITelemetryRepository,
  IIncidentRepository,
  IDocumentRepository,
} from './interfaces';
import {
  LocalMachineRepository,
  LocalTelemetryRepository,
  LocalIncidentRepository,
  LocalDocumentRepository,
} from './local';
import {
  CosmosMachineRepository,
  CosmosTelemetryRepository,
  CosmosIncidentRepository,
  CosmosDocumentRepository,
} from './cosmos';

class RepositoryFactory {
  private machineRepo: IMachineRepository | null = null;
  private telemetryRepo: ITelemetryRepository | null = null;
  private incidentRepo: IIncidentRepository | null = null;
  private documentRepo: IDocumentRepository | null = null;

  getMachineRepository(): IMachineRepository {
    if (!this.machineRepo) {
      this.machineRepo = config.cosmos.isConfigured
        ? new CosmosMachineRepository()
        : new LocalMachineRepository();
    }
    return this.machineRepo;
  }

  getTelemetryRepository(): ITelemetryRepository {
    if (!this.telemetryRepo) {
      this.telemetryRepo = config.cosmos.isConfigured
        ? new CosmosTelemetryRepository()
        : new LocalTelemetryRepository();
    }
    return this.telemetryRepo;
  }

  getIncidentRepository(): IIncidentRepository {
    if (!this.incidentRepo) {
      this.incidentRepo = config.cosmos.isConfigured
        ? new CosmosIncidentRepository()
        : new LocalIncidentRepository();
    }
    return this.incidentRepo;
  }

  getDocumentRepository(): IDocumentRepository {
    if (!this.documentRepo) {
      this.documentRepo = config.cosmos.isConfigured
        ? new CosmosDocumentRepository()
        : new LocalDocumentRepository();
    }
    return this.documentRepo;
  }
}

export const repositoryFactory = new RepositoryFactory();
