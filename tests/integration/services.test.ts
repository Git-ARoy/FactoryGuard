import { describe, it, expect, beforeEach } from 'vitest';
import { machineService } from '../../lib/services/machine.service';
import { dashboardService } from '../../lib/services/dashboard.service';
import { documentService } from '../../lib/services/document.service';
import { localStore } from '../../lib/data/local/local-store';

describe('FactoryGuard Services Integration', () => {
  beforeEach(() => {
    localStore.resetToSeed();
  });

  describe('MachineService', () => {
    it('returns all seeded machines with correct pagination and limits', async () => {
      const res = await machineService.getMachines({ limit: 10 });
      expect(res.items.length).toBe(10);
      expect(res.count).toBe(10);
      expect(res.limit).toBe(10);
    });

    it('filters machines by status', async () => {
      const normalRes = await machineService.getMachines({ status: 'NORMAL' });
      expect(normalRes.items.length).toBeGreaterThan(0);
      normalRes.items.forEach((m) => expect(m.status).toBe('NORMAL'));

      const warnRes = await machineService.getMachines({ status: 'WARNING' });
      expect(warnRes.items.length).toBeGreaterThan(0);
      warnRes.items.forEach((m) => expect(m.status).toBe('WARNING'));
    });

    it('filters machines by line', async () => {
      const res = await machineService.getMachines({ line: 'Precision Line A' });
      expect(res.items.length).toBe(4);
      res.items.forEach((m) => expect(m.line).toContain('Precision Line A'));
    });

    it('filters machines by search query', async () => {
      const res = await machineService.getMachines({ search: 'CNC-02' });
      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe('CNC-02');
    });

    it('retrieves complete machine detail including telemetry and incidents', async () => {
      const detail = await machineService.getMachineDetail('CNC-02');
      expect(detail).not.toBeNull();
      expect(detail!.machine.id).toBe('CNC-02');
      expect(detail!.latestTelemetry).toBeDefined();
      expect(detail!.activeIncidents.length).toBeGreaterThanOrEqual(1);
      expect(detail!.documents.length).toBeGreaterThanOrEqual(1);
    });

    it('returns null for non-existent machine', async () => {
      const detail = await machineService.getMachineDetail('NON_EXISTENT_999');
      expect(detail).toBeNull();
    });

    it('retrieves telemetry history with bounds', async () => {
      const history = await machineService.getTelemetryHistory('CNC-02', { limit: 5 });
      expect(history.items.length).toBe(5);
      expect(history.machineId).toBe('CNC-02');
    });

    it('throws error when querying telemetry for non-existent machine', async () => {
      await expect(
        machineService.getTelemetryHistory('UNKNOWN_MACH')
      ).rejects.toThrow('MACHINE_NOT_FOUND');
    });
  });

  describe('DashboardService', () => {
    it('aggregates plant summary correctly matching total machines', async () => {
      const summary = await dashboardService.getPlantSummary();
      const plant = summary.plant;

      expect(plant.machineCount).toBe(24);
      expect(plant.normalCount + plant.warningCount + plant.criticalCount).toBe(plant.machineCount);
      expect(plant.activeIncidentCount).toBeGreaterThanOrEqual(1);
      expect(plant.healthScore).toBeGreaterThan(0);
      expect(plant.healthScore).toBeLessThanOrEqual(100);
      expect(summary.recentIncidents.length).toBeGreaterThan(0);
    });
  });

  describe('DocumentService', () => {
    it('retrieves documents and generates download information', async () => {
      const docs = await documentService.getDocuments({ machineId: 'CNC-02' });
      expect(docs.items.length).toBeGreaterThanOrEqual(1);

      const downloadInfo = await documentService.getDownloadUrl(docs.items[0].id);
      expect(downloadInfo).not.toBeNull();
      expect(downloadInfo!.url).toBeDefined();
      expect(downloadInfo!.expiresAt).toBeDefined();
    });
  });
});
