import * as appInsights from 'applicationinsights';
import { config } from '../config/env';

let isInitialized = false;

export function initializeObservability(): void {
  if (isInitialized) return;

  if (config.applicationInsights.isConfigured) {
    try {
      appInsights
        .setup(config.applicationInsights.connectionString)
        .setAutoDependencyCorrelation(true)
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true)
        .setUseDiskRetryCaching(true)
        .setSendLiveMetrics(false)
        .start();

      isInitialized = true;
      console.log('[Observability] Azure Application Insights initialized successfully.');
    } catch (err) {
      console.error('[Observability] Failed to initialize Application Insights:', err);
    }
  } else {
    // Local / console structured telemetry
    console.log('[Observability] Running with local structured logging (App Insights not configured).');
  }
}

export interface SimulationTelemetryProperties {
  operation: 'simulation';
  machineId: string;
  scenario: string;
  resultStatus: string;
  incidentId?: string;
  requestId?: string;
  executionDurationMs: number;
}

export class TelemetryLogger {
  static trackSimulation(props: SimulationTelemetryProperties): void {
    initializeObservability();

    if (config.applicationInsights.isConfigured && isInitialized) {
      const client = appInsights.defaultClient;
      if (client) {
        client.trackEvent({
          name: 'FactoryGuard.SimulationTriggered',
          properties: {
            operation: props.operation,
            machineId: props.machineId,
            scenario: props.scenario,
            resultStatus: props.resultStatus,
            incidentId: props.incidentId || 'none',
            requestId: props.requestId || 'n/a',
          },
          measurements: {
            executionDurationMs: props.executionDurationMs,
          },
        });
      }
    }

    // Always emit structured stdout log for Azure App Service Log Stream
    console.log(
      JSON.stringify({
        level: 'INFO',
        timestamp: new Date().toISOString(),
        event: 'SimulationTriggered',
        ...props,
      })
    );
  }

  static trackIncident(
    action: 'CREATED' | 'UPDATED' | 'RESOLVED',
    incidentId: string,
    machineId: string,
    severity: string,
    type: string
  ): void {
    initializeObservability();

    if (config.applicationInsights.isConfigured && isInitialized) {
      const client = appInsights.defaultClient;
      if (client) {
        client.trackEvent({
          name: `FactoryGuard.Incident${action}`,
          properties: {
            action,
            incidentId,
            machineId,
            severity,
            type,
          },
        });
      }
    }

    console.log(
      JSON.stringify({
        level: action === 'RESOLVED' ? 'INFO' : 'WARN',
        timestamp: new Date().toISOString(),
        event: `Incident${action}`,
        incidentId,
        machineId,
        severity,
        type,
      })
    );
  }

  static trackException(error: Error, context?: Record<string, unknown>): void {
    initializeObservability();

    if (config.applicationInsights.isConfigured && isInitialized) {
      const client = appInsights.defaultClient;
      if (client) {
        client.trackException({
          exception: error,
          properties: context,
        });
      }
    }

    console.error(
      JSON.stringify({
        level: 'ERROR',
        timestamp: new Date().toISOString(),
        event: 'ApplicationException',
        message: error.message,
        stack: error.stack,
        context,
      })
    );
  }
}
