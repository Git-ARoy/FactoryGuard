@description('Azure Region where resources will be deployed')
param location string

@description('Prefix for resource names')
param namePrefix string

@description('Environment name (e.g. workshop, dev, prod)')
param environment string

@description('Unique string token to prevent naming collisions')
param uniqueSuffix string

@description('App Service Plan SKU name (e.g. B1, F1, S1)')
param skuName string = 'B1'

@description('App Service Plan Tier (e.g. Basic, Free, Standard)')
param skuTier string = 'Basic'

@description('Application Insights Connection String')
param appInsightsConnectionString string

@description('Storage Account connection string for document access and SAS generation')
param storageConnectionString string

@description('Cosmos DB Endpoint URL')
param cosmosEndpoint string

@secure()
@description('Cosmos DB Primary Key')
param cosmosKey string

@description('Backend Azure Function App Base URL (internal proxy target)')
param functionBaseUrl string

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

var planName = 'asp-${namePrefix}-${environment}-${uniqueSuffix}'
var webAppName = 'app-${namePrefix}-${environment}-${uniqueSuffix}'

// Dedicated Linux App Service Plan for Next.js Frontend
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
    tier: skuTier
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Next.js Web App (Linux, Node.js 24 LTS)
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: appServicePlan.id
    reserved: true
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|24-lts'
      appCommandLine: 'npm run start'
      appSettings: [
        {
          name: 'PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
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
        {
          name: 'FUNCTION_BASE_URL'
          value: functionBaseUrl
        }
      ]
    }
  }
}

output appServiceId string = webApp.id
output appServiceName string = webApp.name
output appServiceUrl string = 'https://${webApp.properties.defaultHostName}'
output defaultHostName string = webApp.properties.defaultHostName
