@description('Azure Region where resources will be deployed')
param location string

@description('Prefix for resource names')
param namePrefix string

@description('Environment name (e.g. workshop, dev, prod)')
param environment string

@description('Unique string token to prevent naming collisions')
param uniqueSuffix string

var logAnalyticsName = 'log-${namePrefix}-${environment}-${uniqueSuffix}'
var appInsightsName = 'appi-${namePrefix}-${environment}-${uniqueSuffix}'

// 1. Log Analytics Workspace (Azure Monitor backend)
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// 2. Azure Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    RetentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

output appInsightsId string = appInsights.id
output appInsightsName string = appInsights.name
output connectionString string = appInsights.properties.ConnectionString
output instrumentationKey string = appInsights.properties.InstrumentationKey
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
