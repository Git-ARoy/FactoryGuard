import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationService } from '../../lib/services/simulation.service';
import { localStore } from '../../lib/data/local/local-store';
import { repositoryFactory } from '../../lib/data/factory';

describe('FactoryGuard Incident Deduplication & Resolution', () => {
  let simulationService: SimulationService;
  const incidentRepo = repositoryFactory.getIncidentRepository();

  beforeEach(() => {
    localStore.resetToSeed();
    simulationService = new SimulationService();
  });

  it('updates existing open incident without creating uncontrolled duplicate incidents', async () => {
    // 1. Initial state for CNC-01 (NORMAL machine)
    const machineId = 'CNC-01';
    let openIncidents = await incidentRepo.findActiveByMachine(machineId);
    expect(openIncidents.length).toBe(0);

    // 2. Trigger first WARNING
    const res1 = await simulationService.triggerEvent(machineId, 'WARNING');
    expect(res1.machine.status).toBe('WARNING');
    expect(res1.incident).not.toBeNull();

    openIncidents = await incidentRepo.findActiveByMachine(machineId);
    expect(openIncidents.length).toBe(1);
    const incidentId1 = openIncidents[0].id;

    // 3. Trigger second WARNING (simulating repeat event or page refresh)
    const res2 = await simulationService.triggerEvent(machineId, 'WARNING');
    expect(res2.machine.status).toBe('WARNING');

    // Should still have exactly 1 open incident, NOT 2
    openIncidents = await incidentRepo.findActiveByMachine(machineId);
    expect(openIncidents.length).toBe(1);
    expect(openIncidents[0].id).toBe(incidentId1);

    // 4. Trigger RECOVERY
    const res3 = await simulationService.resetMachine(machineId);
    expect(res3.status).toBe('NORMAL');
    expect(res3.resolvedIncidentIds).toContain(incidentId1);

    // Open incidents should now be 0
    openIncidents = await incidentRepo.findActiveByMachine(machineId);
    expect(openIncidents.length).toBe(0);

    // Incident in history is marked RESOLVED
    const incident = await incidentRepo.getById(incidentId1);
    expect(incident?.status).toBe('RESOLVED');
    expect(incident?.resolvedAt).not.toBeNull();
  });
});
