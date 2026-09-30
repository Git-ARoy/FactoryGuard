@description('Azure Region where resources will be deployed')
param location string

@description('Prefix for resource names')
param namePrefix string

@description('Environment name (e.g. workshop, dev, prod)')
param environment string

@description('Unique string token to prevent naming collisions')
param uniqueSuffix string

@description('Application Insights Connection String')
param appInsightsConnectionString string

@description('Storage Account connection string for AzureWebJobsStorage and documents')
param storageConnectionString string

@description('Cosmos DB Endpoint URL')
param cosmosEndpoint string

@secure()
@description('Cosmos DB Primary Key')
param cosmosKey string

@description('Cosmos DB Database name')
param cosmosDatabaseName string = 'factoryguard'

@description('Cosmos DB Machines container name')
param cosmosMachinesContainer string = 'machines'

@description('Cosmos DB Telemetry container name')
param cosmosTelemetryContainer string = 'telemetry'

@description('Cosmos DB Incidents container name')
param cosmosIncidentsContainer string = 'incidents'

@description('Cosmos DB Documents container name')
param cosmosDocumentsContainer string = 'documents'

@description('Storage Container name')
param storageContainerName string = 'documents'

var planName = 'asp-func-${namePrefix}-${environment}-${uniqueSuffix}'
var functionAppName = 'func-${namePrefix}-${environment}-${uniqueSuffix}'

// Serverless Hosting Plan for Functions (Linux Consumption Y1)
resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp,linux'
  properties: {
    reserved: true
  }
}

// Function App (Linux, Node.js 24 LTS, Functions v4)
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: hostingPlan.id
    reserved: true
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: storageConnectionString
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~24'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'COSMOS_ENDPOINT'
          value: cosmosEndpoint
        }
        {
          name: 'COSMOS_KEY'
          value: cosmosKey
        }
        {
          name: 'COSMOS_DATABASE'
          value: cosmosDatabaseName
        }
        {
          name: 'COSMOS_MACHINES_CONTAINER'
          value: cosmosMachinesContainer
        }
        {
          name: 'COSMOS_TELEMETRY_CONTAINER'
          value: cosmosTelemetryContainer
        }
        {
          name: 'COSMOS_INCIDENTS_CONTAINER'
          value: cosmosIncidentsContainer
        }
        {
          name: 'COSMOS_DOCUMENTS_CONTAINER'
          value: cosmosDocumentsContainer
        }
        {
          name: 'STORAGE_CONNECTION_STRING'
          value: storageConnectionString
        }
        {
          name: 'STORAGE_CONTAINER_NAME'
          value: storageContainerName
        }
      ]
      cors: {
        allowedOrigins: [
          '*'
        ]
        supportCredentials: false
      }
    }
  }
}

output functionAppId string = functionApp.id
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output defaultHostName string = functionApp.properties.defaultHostName
