import { repositoryFactory } from '../data/factory';
import { DashboardSummaryResponse, PlantSummary } from '../domain/types';

export class DashboardService {
  private machineRepo = repositoryFactory.getMachineRepository();
  private incidentRepo = repositoryFactory.getIncidentRepository();

  async getPlantSummary(): Promise<DashboardSummaryResponse> {
    const machines = await this.machineRepo.getAll();
    const activeIncidents = await this.incidentRepo.getAll({ status: 'OPEN', limit: 10 });

    const totalMachines = machines.length;
    const normalCount = machines.filter((m) => m.status === 'NORMAL').length;
    const warningCount = machines.filter((m) => m.status === 'WARNING').length;
    const criticalCount = machines.filter((m) => m.status === 'CRITICAL').length;

    // Calculate plant overall health score as average of all machine health scores
    const totalHealth = machines.reduce((acc, m) => acc + (m.healthScore || 100), 0);
    const plantHealth = totalMachines > 0 ? Math.round(totalHealth / totalMachines) : 100;

    const plant: PlantSummary = {
      machineCount: totalMachines,
      normalCount,
      warningCount,
      criticalCount,
      activeIncidentCount: activeIncidents.length,
      healthScore: plantHealth,
    };

    return {
      plant,
      recentIncidents: activeIncidents,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const dashboardService = new DashboardService();
