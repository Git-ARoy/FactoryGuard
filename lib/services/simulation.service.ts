import { repositoryFactory } from '../data/factory';
import {
  SimulationScenario,
  SimulationEventResult,
  SimulationResetResult,
  Incident,
} from '../domain/types';
import { generateSimulationTelemetry } from '../domain/simulation-engine';
import { evaluateTelemetry } from '../domain/anomaly-engine';
import { TelemetryLogger } from '../observability';

export class SimulationService {
  private machineRepo = repositoryFactory.getMachineRepository();
  private telemetryRepo = repositoryFactory.getTelemetryRepository();
  private incidentRepo = repositoryFactory.getIncidentRepository();

  async triggerEvent(
    machineId: string,
    scenario: SimulationScenario,
    requestId?: string
  ): Promise<SimulationEventResult> {
    const startTime = Date.now();

    // 1. Verify machine exists
    const machine = await this.machineRepo.getById(machineId);
    if (!machine) {
      throw new Error(`MACHINE_NOT_FOUND: Machine ${machineId} does not exist.`);
    }

    // 2. If scenario is RECOVERY, delegate to recovery flow
    if (scenario === 'RECOVERY') {
      const resetResult = await this.resetMachine(machineId, requestId);
      const tel = generateSimulationTelemetry(machineId, 'RECOVERY', machine.operatingHours);
      await this.telemetryRepo.record(tel);

      const durationMs = Date.now() - startTime;
      TelemetryLogger.trackSimulation({
        operation: 'simulation',
        machineId,
        scenario,
        resultStatus: 'NORMAL',
        requestId,
        executionDurationMs: durationMs,
      });

      return {
        success: true,
        scenario: 'RECOVERY',
        machine: {
          id: machineId,
          status: 'NORMAL',
          healthScore: 96,
        },
        telemetry: {
          id: tel.id,
          temperatureC: tel.temperatureC,
          vibrationMmS: tel.vibrationMmS,
          pressurePsi: tel.pressurePsi,
          scenario: 'RECOVERY',
          source: 'simulator',
        },
        incident: null,
      };
    }

    // 3. Generate deterministic telemetry
    const telemetryEvent = generateSimulationTelemetry(
      machineId,
      scenario,
      machine.operatingHours
    );

    // 4. Anomaly evaluation
    const evaluation = evaluateTelemetry({
      temperatureC: telemetryEvent.temperatureC,
      vibrationMmS: telemetryEvent.vibrationMmS,
      pressurePsi: telemetryEvent.pressurePsi,
    });

    // 5. Update machine record in Cosmos DB / repository
    await this.machineRepo.updateStatus(
      machineId,
      evaluation.status,
      evaluation.healthScore,
      telemetryEvent.timestamp
    );

    // 6. Record telemetry event in repository
    await this.telemetryRepo.record(telemetryEvent);

    // 7. Handle incident generation or deduplication
    let activeIncident: Incident | null = null;

    if (evaluation.anomalyDetected && evaluation.severity && evaluation.incidentType) {
      // Check for existing open incident of same type for deduplication
      const existingOpen = await this.incidentRepo.findActiveByMachineAndType(
        machineId,
        evaluation.incidentType
      );

      if (existingOpen) {
        // Update existing incident snapshot rather than creating duplicate spam
        existingOpen.severity = evaluation.severity;
        existingOpen.title = evaluation.title || existingOpen.title;
        existingOpen.description = evaluation.description || existingOpen.description;
        existingOpen.triggerTelemetryId = telemetryEvent.id;
        existingOpen.telemetrySnapshot = {
          temperatureC: telemetryEvent.temperatureC,
          vibrationMmS: telemetryEvent.vibrationMmS,
          pressurePsi: telemetryEvent.pressurePsi,
        };

        activeIncident = await this.incidentRepo.update(existingOpen);
        TelemetryLogger.trackIncident(
          'UPDATED',
          activeIncident.id,
          machineId,
          activeIncident.severity,
          activeIncident.type
        );
      } else {
        // Create new incident
        const newIncident: Incident = {
          id: `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          machineId,
          severity: evaluation.severity,
          type: evaluation.incidentType,
          title: evaluation.title || `${evaluation.severity} Incident Detected`,
          description:
            evaluation.description ||
            `Operating parameters exceeded normal tolerances.`,
          status: 'OPEN',
          detectedAt: telemetryEvent.timestamp,
          resolvedAt: null,
          triggerTelemetryId: telemetryEvent.id,
          telemetrySnapshot: {
            temperatureC: telemetryEvent.temperatureC,
            vibrationMmS: telemetryEvent.vibrationMmS,
            pressurePsi: telemetryEvent.pressurePsi,
          },
        };

        activeIncident = await this.incidentRepo.create(newIncident);
        TelemetryLogger.trackIncident(
          'CREATED',
          activeIncident.id,
          machineId,
          activeIncident.severity,
          activeIncident.type
        );
      }
    } else if (evaluation.status === 'NORMAL') {
      // If machine returned to normal, resolve active open incidents
      const resolvedIds = await this.incidentRepo.resolveActiveForMachine(machineId);
      for (const id of resolvedIds) {
        TelemetryLogger.trackIncident('RESOLVED', id, machineId, 'NORMAL', 'RECOVERY');
      }
    }

    const durationMs = Date.now() - startTime;
    TelemetryLogger.trackSimulation({
      operation: 'simulation',
      machineId,
      scenario,
      resultStatus: evaluation.status,
      incidentId: activeIncident?.id,
      requestId,
      executionDurationMs: durationMs,
    });

    return {
      success: true,
      scenario,
      machine: {
        id: machineId,
        status: evaluation.status,
        healthScore: evaluation.healthScore,
      },
      telemetry: {
        id: telemetryEvent.id,
        temperatureC: telemetryEvent.temperatureC,
        vibrationMmS: telemetryEvent.vibrationMmS,
        pressurePsi: telemetryEvent.pressurePsi,
        scenario: telemetryEvent.scenario,
        source: 'simulator',
      },
      incident: activeIncident
        ? {
            id: activeIncident.id,
            severity: activeIncident.severity,
            status: activeIncident.status,
          }
        : null,
    };
  }

  async resetMachine(
    machineId: string,
    requestId?: string
  ): Promise<SimulationResetResult> {
    const startTime = Date.now();
    const machine = await this.machineRepo.getById(machineId);
    if (!machine) {
      throw new Error(`MACHINE_NOT_FOUND: Machine ${machineId} does not exist.`);
    }

    const now = new Date().toISOString();
    await this.machineRepo.updateStatus(machineId, 'NORMAL', 96, now);

    const resolvedIncidentIds = await this.incidentRepo.resolveActiveForMachine(machineId);

    const durationMs = Date.now() - startTime;
    TelemetryLogger.trackSimulation({
      operation: 'simulation',
      machineId,
      scenario: 'RECOVERY',
      resultStatus: 'NORMAL',
      requestId,
      executionDurationMs: durationMs,
    });

    return {
      success: true,
      machineId,
      status: 'NORMAL',
      resolvedIncidentIds,
    };
  }
}

export const simulationService = new SimulationService();
