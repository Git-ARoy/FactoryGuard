import { describe, it, expect, beforeEach } from 'vitest';
import { dashboardService } from '../../lib/services/dashboard.service';
import { machineService } from '../../lib/services/machine.service';
import { simulationService } from '../../lib/services/simulation.service';
import { resetMockCosmosToSeed } from '../mocks/azure-cosmos-mock';

describe('FactoryGuard Workshop 10-Minute Demo Acceptance Test (REQUIREMENTS.md Section 9)', () => {
  beforeEach(() => {
    resetMockCosmosToSeed();
  });

  it('passes the end-to-end 10-step workshop flow deterministically', async () => {
    const demoMachineId = 'CNC-02';

    // Step 1: Open FactoryGuard dashboard (Get plant summary)
    const summary = await dashboardService.getPlantSummary();
    expect(summary).toBeDefined();

    // Step 2: Confirm machines and plant summary are populated
    expect(summary.plant.machineCount).toBe(24);
    expect(summary.plant.normalCount).toBeGreaterThan(0);
    expect(summary.recentIncidents.length).toBeGreaterThan(0);

    // Step 3: Select demo machine
    const initialDetail = await machineService.getMachineDetail(demoMachineId);
    expect(initialDetail).not.toBeNull();
    expect(initialDetail!.machine.id).toBe(demoMachineId);

    // Step 4: Trigger WARNING
    const warnSim = await simulationService.triggerEvent(demoMachineId, 'WARNING');
    expect(warnSim.success).toBe(true);

    // Step 5: Observe machine state change to WARNING
    expect(warnSim.machine.status).toBe('WARNING');
    expect(warnSim.machine.healthScore).toBeGreaterThanOrEqual(50);
    expect(warnSim.machine.healthScore).toBeLessThanOrEqual(79);

    // Step 6: Observe incident creation
    expect(warnSim.incident).not.toBeNull();
    expect(warnSim.incident!.severity).toBe('WARNING');
    const warningIncidentId = warnSim.incident!.id;

    // Step 7 & 8: Query state / refresh page & Confirm state persists
    const refreshedDetail = await machineService.getMachineDetail(demoMachineId);
    expect(refreshedDetail!.machine.status).toBe('WARNING');
    const hasActiveWarning = refreshedDetail!.activeIncidents.some(
      (inc) => inc.id === warningIncidentId && inc.status === 'OPEN'
    );
    expect(hasActiveWarning).toBe(true);

    // Step 9: Trigger CRITICAL
    const critSim = await simulationService.triggerEvent(demoMachineId, 'CRITICAL');
    expect(critSim.success).toBe(true);
    expect(critSim.machine.status).toBe('CRITICAL');
    expect(critSim.machine.healthScore).toBeLessThanOrEqual(49);
    expect(critSim.incident).not.toBeNull();
    expect(critSim.incident!.severity).toBe('CRITICAL');

    // Confirm critical state persisted
    const critDetail = await machineService.getMachineDetail(demoMachineId);
    expect(critDetail!.machine.status).toBe('CRITICAL');

    // Step 10: Trigger Recovery & observe restoration
    const resetSim = await simulationService.resetMachine(demoMachineId);
    expect(resetSim.success).toBe(true);
    expect(resetSim.status).toBe('NORMAL');

    const recoveredDetail = await machineService.getMachineDetail(demoMachineId);
    expect(recoveredDetail!.machine.status).toBe('NORMAL');
    expect(recoveredDetail!.activeIncidents.length).toBe(0);

    // Verify telemetry stream has recorded all events
    const telemetryHistory = await machineService.getTelemetryHistory(demoMachineId, { limit: 10 });
    expect(telemetryHistory.items.length).toBeGreaterThan(0);
  });
});
