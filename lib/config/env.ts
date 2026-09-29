/**
 * Centralized Configuration Module
 * Inspects environment and provides configuration flags and credentials safely.
 */

export interface AppConfig {
  env: string;
  version: string;
  port: number;

  // Cosmos DB
  cosmos: {
    endpoint: string;
    key: string;
    database: string;
    containers: {
      machines: string;
      telemetry: string;
      incidents: string;
      documents: string;
    };
    isConfigured: boolean;
  };

  // Blob Storage
  storage: {
    accountUrl: string;
    connectionString: string;
    containerName: string;
    isConfigured: boolean;
  };

  // Azure Functions
  functions: {
    baseUrl: string;
    internalSecret: string;
    isConfigured: boolean;
  };

  // Observability
  applicationInsights: {
    connectionString: string;
    isConfigured: boolean;
  };

  // Simulation
  simulation: {
    defaultMachineId: string;
  };
}

export function getConfig(): AppConfig {
  const cosmosEndpoint = process.env.COSMOS_ENDPOINT?.trim() || '';
  const cosmosKey = process.env.COSMOS_KEY?.trim() || '';
  const storageAccountUrl = process.env.STORAGE_ACCOUNT_URL?.trim() || '';
  const storageConnectionString = process.env.STORAGE_CONNECTION_STRING?.trim() || '';
  const functionBaseUrl = process.env.FUNCTION_BASE_URL?.trim() || '';
  const appInsightsConn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING?.trim() || '';

  return {
    env: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT || '3000', 10),

    cosmos: {
      endpoint: cosmosEndpoint,
      key: cosmosKey,
      database: process.env.COSMOS_DATABASE || 'factoryguard',
      containers: {
        machines: process.env.COSMOS_MACHINES_CONTAINER || 'machines',
        telemetry: process.env.COSMOS_TELEMETRY_CONTAINER || 'telemetry',
        incidents: process.env.COSMOS_INCIDENTS_CONTAINER || 'incidents',
        documents: process.env.COSMOS_DOCUMENTS_CONTAINER || 'documents',
      },
      isConfigured: Boolean(cosmosEndpoint && cosmosKey),
    },

    storage: {
      accountUrl: storageAccountUrl,
      connectionString: storageConnectionString,
      containerName: process.env.STORAGE_CONTAINER_NAME || 'documents',
      isConfigured: Boolean(storageAccountUrl || storageConnectionString),
    },

    functions: {
      baseUrl: functionBaseUrl,
      internalSecret: process.env.FUNCTION_INTERNAL_SECRET?.trim() || '',
      isConfigured: Boolean(functionBaseUrl),
    },

    applicationInsights: {
      connectionString: appInsightsConn,
      isConfigured: Boolean(appInsightsConn),
    },

    simulation: {
      defaultMachineId: process.env.SIMULATION_DEFAULT_MACHINE_ID || 'CNC-02',
    },
  };
}

export const config = getConfig();
