import {
  DashboardSummaryResponse,
  Machine,
  MachineDetailResponse,
  TelemetryEvent,
  Incident,
  DocumentMetadata,
  SimulationEventResult,
  SimulationResetResult,
  SimulationScenario,
  MachineStatus,
  IncidentStatus,
  IncidentSeverity,
  DocumentCategory,
  HealthCheckResponse,
  PaginatedResponse,
} from '../domain/types';

class ApiClient {
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        errorMsg = errorJson?.error?.message || errorMsg;
      } catch {
        // use fallback
      }
      throw new Error(errorMsg);
    }

    return res.json();
  }

  async getHealth(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('/api/health');
  }

  async getDashboardSummary(): Promise<DashboardSummaryResponse> {
    return this.request<DashboardSummaryResponse>('/api/dashboard/summary');
  }

  async getMachines(filters?: {
    status?: MachineStatus;
    line?: string;
    search?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Machine>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.line) params.set('line', filters.line);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<Machine>>(`/api/machines${qs}`);
  }

  async getMachineDetail(machineId: string): Promise<MachineDetailResponse> {
    return this.request<MachineDetailResponse>(`/api/machines/${machineId}`);
  }

  async getMachineTelemetry(
    machineId: string,
    limit = 20
  ): Promise<{ machineId: string; items: TelemetryEvent[]; count: number; limit: number }> {
    return this.request(`/api/machines/${machineId}/telemetry?limit=${limit}`);
  }

  async getIncidents(filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    machineId?: string;
    limit?: number;
  }): Promise<PaginatedResponse<Incident>> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.machineId) params.set('machineId', filters.machineId);
    if (filters?.limit) params.set('limit', filters.limit.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<PaginatedResponse<Incident>>(`/api/incidents${qs}`);
  }

  async getIncident(incidentId: string): Promise<Incident> {
    return this.request<Incident>(`/api/incidents/${incidentId}`);
  }

  async triggerSimulation(
    machineId: string,
    scenario: SimulationScenario
  ): Promise<SimulationEventResult> {
    return this.request<SimulationEventResult>('/api/simulations/events', {
      method: 'POST',
      body: JSON.stringify({ machineId, scenario }),
    });
  }

  async resetSimulation(machineId: string): Promise<SimulationResetResult> {
    return this.request<SimulationResetResult>('/api/simulations/reset', {
      method: 'POST',
      body: JSON.stringify({ machineId }),
    });
  }

  async getDocuments(filters?: {
    machineId?: string;
    category?: DocumentCategory;
  }): Promise<{ items: DocumentMetadata[] }> {
    const params = new URLSearchParams();
    if (filters?.machineId) params.set('machineId', filters.machineId);
    if (filters?.category) params.set('category', filters.category);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ items: DocumentMetadata[] }>(`/api/documents${qs}`);
  }

  async getDocumentDownloadUrl(
    documentId: string
  ): Promise<{ documentId: string; url: string; expiresAt: string }> {
    return this.request(`/api/documents/${documentId}/download-url`);
  }
}

export const apiClient = new ApiClient();
