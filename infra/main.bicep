targetScope = 'resourceGroup'

@description('Deployment environment name (e.g. workshop, dev, staging, prod)')
param environment string = 'workshop'

@description('Azure Region for resource deployment. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Base prefix for all resource naming conventions')
@minLength(3)
@maxLength(16)
param namePrefix string = 'factoryguard'

@description('Use Cosmos DB Serverless capacity mode (recommended for workshops & dev)')
param cosmosUseServerless bool = true

@description('App Service Plan pricing SKU for frontend Next.js')
param appServiceSku string = 'B1'

@description('App Service Plan pricing tier for frontend Next.js')
param appServiceTier string = 'Basic'

// Deterministic unique suffix based on resource group ID to prevent global DNS collisions
var uniqueSuffix = take(uniqueString(resourceGroup().id), 6)

// 1. Observability: Log Analytics Workspace & Application Insights
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    environment: environment
    uniqueSuffix: uniqueSuffix
  }
}

// 2. Storage: Storage Account & Documents Blob Container
module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    environment: environment
    uniqueSuffix: uniqueSuffix
  }
}

// 3. Data: Cosmos DB for NoSQL, Database & 4 Partitioned Containers
module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    environment: environment
    uniqueSuffix: uniqueSuffix
    useServerless: cosmosUseServerless
  }
}

// 4. Serverless API: Azure Functions v4 (Linux, Node.js 24 LTS)
module functions 'modules/functions.bicep' = {
  name: 'functions-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    environment: environment
    uniqueSuffix: uniqueSuffix
    appInsightsConnectionString: monitoring.outputs.connectionString
    storageConnectionString: storage.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.primaryKey
    cosmosDatabaseName: cosmos.outputs.databaseName
    cosmosMachinesContainer: cosmos.outputs.machinesContainerName
    cosmosTelemetryContainer: cosmos.outputs.telemetryContainerName
    cosmosIncidentsContainer: cosmos.outputs.incidentsContainerName
    cosmosDocumentsContainer: cosmos.outputs.documentsContainerName
    storageContainerName: storage.outputs.containerName
  }
}

// 5. Frontend & Gateway: Azure App Service (Linux, Node.js 24 LTS, Next.js)
module appservice 'modules/appservice.bicep' = {
  name: 'appservice-deployment'
  params: {
    location: location
    namePrefix: namePrefix
    environment: environment
    uniqueSuffix: uniqueSuffix
    skuName: appServiceSku
    skuTier: appServiceTier
    appInsightsConnectionString: monitoring.outputs.connectionString
    storageConnectionString: storage.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosKey: cosmos.outputs.primaryKey
    cosmosDatabaseName: cosmos.outputs.databaseName
    cosmosMachinesContainer: cosmos.outputs.machinesContainerName
    cosmosTelemetryContainer: cosmos.outputs.telemetryContainerName
    cosmosIncidentsContainer: cosmos.outputs.incidentsContainerName
    cosmosDocumentsContainer: cosmos.outputs.documentsContainerName
    storageContainerName: storage.outputs.containerName
    functionBaseUrl: functions.outputs.functionAppUrl
  }
}

// ==============================================================================
// Deployment Outputs
// ==============================================================================

@description('Public URL of the Next.js Operations Web Application')
output appServiceUrl string = appservice.outputs.appServiceUrl

@description('Public URL of the Serverless Azure Functions API')
output functionAppUrl string = functions.outputs.functionAppUrl

@description('Azure Cosmos DB Account URI')
output cosmosEndpoint string = cosmos.outputs.endpoint

@description('Azure Storage Account Name')
output storageAccountName string = storage.outputs.storageAccountName

@description('Azure Application Insights Resource Name')
output appInsightsName string = monitoring.outputs.appInsightsName

@description('Resource Group containing deployed resources')
output resourceGroupName string = resourceGroup().name
