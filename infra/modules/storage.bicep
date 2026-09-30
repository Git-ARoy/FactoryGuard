@description('Azure Region where resources will be deployed')
param location string

@description('Prefix for resource names')
param namePrefix string

@description('Environment name (e.g. workshop, dev, prod)')
param environment string

@description('Unique string token to prevent naming collisions')
@minLength(6)
param uniqueSuffix string

// Storage account names must be 3-24 characters, numbers and lowercase letters only
var cleanPrefix = replace(toLower(namePrefix), '-', '')
var cleanEnv = replace(toLower(environment), '-', '')
var storageAccountName = 'st${take('${cleanPrefix}${cleanEnv}${uniqueSuffix}', 22)}'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource documentsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: 'documents'
  properties: {
    publicAccess: 'None'
  }
}

var storageKeys = storageAccount.listKeys().keys
var primaryKey = storageKeys[0].value

output storageAccountId string = storageAccount.id
output storageAccountName string = storageAccount.name
output containerName string = documentsContainer.name
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob

#disable-next-line outputs-should-not-contain-secrets
output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${primaryKey};EndpointSuffix=${az.environment().suffixes.storage}'
