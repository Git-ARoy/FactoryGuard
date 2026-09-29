import { repositoryFactory } from '../data/factory';
import { Incident, PaginatedResponse } from '../domain/types';
import { IncidentFilters } from '../data/interfaces';

export class IncidentService {
  private incidentRepo = repositoryFactory.getIncidentRepository();

  async getIncidents(filters?: IncidentFilters): Promise<PaginatedResponse<Incident>> {
    const items = await this.incidentRepo.getAll(filters);
    return {
      items,
      count: items.length,
      limit: filters?.limit || 25,
    };
  }

  async getIncidentById(id: string): Promise<Incident | null> {
    return this.incidentRepo.getById(id);
  }
}

export const incidentService = new IncidentService();
