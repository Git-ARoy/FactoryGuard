import {
  IMachineRepository,
  ITelemetryRepository,
  IIncidentRepository,
  IDocumentRepository,
} from './interfaces';
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
      this.machineRepo = new CosmosMachineRepository();
    }
    return this.machineRepo;
  }

  getTelemetryRepository(): ITelemetryRepository {
    if (!this.telemetryRepo) {
      this.telemetryRepo = new CosmosTelemetryRepository();
    }
    return this.telemetryRepo;
  }

  getIncidentRepository(): IIncidentRepository {
    if (!this.incidentRepo) {
      this.incidentRepo = new CosmosIncidentRepository();
    }
    return this.incidentRepo;
  }

  getDocumentRepository(): IDocumentRepository {
    if (!this.documentRepo) {
      this.documentRepo = new CosmosDocumentRepository();
    }
    return this.documentRepo;
  }

  resetRepositories(): void {
    this.machineRepo = null;
    this.telemetryRepo = null;
    this.incidentRepo = null;
    this.documentRepo = null;
  }
}

export const repositoryFactory = new RepositoryFactory();
