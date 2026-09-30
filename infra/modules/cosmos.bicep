@description('Azure Region where resources will be deployed')
param location string

@description('Prefix for resource names')
param namePrefix string

@description('Environment name (e.g. workshop, dev, prod)')
param environment string

@description('Unique string token to prevent naming collisions')
param uniqueSuffix string

@description('Whether to use Cosmos DB Serverless capacity mode (recommended for workshops)')
param useServerless bool = true

var cosmosAccountName = take('cosmos-${namePrefix}-${environment}-${uniqueSuffix}', 44)
var databaseName = 'factoryguard'

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: useServerless ? [
      {
        name: 'EnableServerless'
      }
    ] : []
    publicNetworkAccess: 'Enabled'
    networkAclBypass: 'AzureServices'
  }
}

// FactoryGuard SQL Database
resource sqlDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: databaseName
  properties: {
    resource: {
      id: databaseName
    }
    options: useServerless ? {} : {
      throughput: 400
    }
  }
}

// 1. Machines Container (Partition Key: /id)
resource machinesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDatabase
  name: 'machines'
  properties: {
    resource: {
      id: 'machines'
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
    }
  }
}

// 2. Telemetry Container (Partition Key: /machineId)
resource telemetryContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDatabase
  name: 'telemetry'
  properties: {
    resource: {
      id: 'telemetry'
      partitionKey: {
        paths: [
          '/machineId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
    }
  }
}

// 3. Incidents Container (Partition Key: /machineId)
resource incidentsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDatabase
  name: 'incidents'
  properties: {
    resource: {
      id: 'incidents'
      partitionKey: {
        paths: [
          '/machineId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
    }
  }
}

// 4. Documents Metadata Container (Partition Key: /machineId)
resource documentsMetaContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: sqlDatabase
  name: 'documents'
  properties: {
    resource: {
      id: 'documents'
      partitionKey: {
        paths: [
          '/machineId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
    }
  }
}

output cosmosAccountId string = cosmosAccount.id
output cosmosAccountName string = cosmosAccount.name
output endpoint string = cosmosAccount.properties.documentEndpoint

#disable-next-line outputs-should-not-contain-secrets
output primaryKey string = cosmosAccount.listKeys().primaryMasterKey
output databaseName string = databaseName
output machinesContainerName string = machinesContainer.name
output telemetryContainerName string = telemetryContainer.name
output incidentsContainerName string = incidentsContainer.name
output documentsContainerName string = documentsMetaContainer.name
