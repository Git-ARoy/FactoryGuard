import { repositoryFactory } from '../data/factory';
import {
  Machine,
  MachineDetailResponse,
  TelemetryEvent,
  PaginatedResponse,
} from '../domain/types';
import { MachineFilters, TelemetryFilters } from '../data/interfaces';

export class MachineService {
  private machineRepo = repositoryFactory.getMachineRepository();
  private telemetryRepo = repositoryFactory.getTelemetryRepository();
  private incidentRepo = repositoryFactory.getIncidentRepository();
  private documentRepo = repositoryFactory.getDocumentRepository();

  async getMachines(filters?: MachineFilters): Promise<PaginatedResponse<Machine>> {
    const items = await this.machineRepo.getAll(filters);
    return {
      items,
      count: items.length,
      limit: filters?.limit || 25,
    };
  }

  async getMachineDetail(machineId: string): Promise<MachineDetailResponse | null> {
    const machine = await this.machineRepo.getById(machineId);
    if (!machine) return null;

    const [latestTelemetry, activeIncidents, documents] = await Promise.all([
      this.telemetryRepo.getLatest(machineId),
      this.incidentRepo.findActiveByMachine(machineId),
      this.documentRepo.getAll({ machineId }),
    ]);

    return {
      machine,
      latestTelemetry: latestTelemetry || undefined,
      activeIncidents,
      documents,
    };
  }

  async getTelemetryHistory(
    machineId: string,
    filters?: TelemetryFilters
  ): Promise<{ machineId: string; items: TelemetryEvent[]; count: number; limit: number }> {
    const machine = await this.machineRepo.getById(machineId);
    if (!machine) {
      throw new Error(`MACHINE_NOT_FOUND: Machine ${machineId} does not exist.`);
    }

    const items = await this.telemetryRepo.getHistory(machineId, filters);
    return {
      machineId,
      items,
      count: items.length,
      limit: filters?.limit || 20,
    };
  }
}

export const machineService = new MachineService();
