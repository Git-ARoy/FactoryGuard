# FactoryGuard - Azure Infrastructure as Code (Bicep)

**Phase B: Automated Cloud Infrastructure Deployment**

This directory contains the production-grade Azure Bicep templates to automate the end-to-end provisioning of the FactoryGuard cloud architecture on Microsoft Azure.

---

## Architecture Overview

```text
                                  +------------------------------------+
                                  |         Operations Browser         |
                                  +-----------------+------------------+
                                                    |
                                             HTTPS  |
                                                    v
                                  +------------------------------------+
                                  |         Azure App Service          |
                                  | Next.js 14 App Router (Node 24 LTS)|
                                  |   • App Service Plan (Linux B1)    |
                                  |   • Pre-configured App Settings    |
                                  +-----------------+------------------+
                                                    |
                                    Internal Proxy  |  Server-to-Server
                                                    v
                                  +------------------------------------+
                                  |          Azure Functions           |
                                  |  v4 Programming Model (TypeScript) |
                                  |   • Consumption Plan (Linux Y1)    |
                                  |   • Node.js 24 LTS Runtime         |
                                  +--------+------------------+--------+
                                           |                  |
                                           v                  v
                    +------------------------------+  +----------------------------+
                    |   Azure Cosmos DB (NoSQL)    |  |     Azure Blob Storage     |
                    |   • Database: factoryguard   |  |   • Storage Account (LRS)  |
                    |   • machines    (/id)        |  |   • Container: documents   |
                    |   • telemetry   (/machineId) |  |   • Secure signed SAS      |
                    |   • incidents   (/machineId) |  +----------------------------+
                    |   • documents   (/machineId) |                 ^
                    +------------------------------+                 |
                                           ^                         |
                                           |                         |
                                  +--------+-------------------------+
                                  |     Azure Application Insights     |
                                  |   • Log Analytics Workspace        |
                                  |   • Distributed Tracing & Metrics  |
                                  +------------------------------------+
```

---

## Directory Structure

```text
infra/
├── main.bicep                  # Orchestrator template deploying all modules
├── main.parameters.json        # Default parameter values (workshop environment)
├── modules/
│   ├── monitoring.bicep        # Log Analytics Workspace & Application Insights
│   ├── storage.bicep           # Azure Storage Account & documents Blob container
│   ├── cosmos.bicep            # Cosmos DB for NoSQL, factoryguard database & 4 containers
│   ├── functions.bicep         # Linux Function App (Node 24 LTS, Functions v4)
│   └── appservice.bicep        # Linux App Service Plan & Next.js Web App (Node 24 LTS)
└── README.md                   # This documentation
```

---

## Automated Resources Provisioned

| Azure Resource | Resource Type | Module | Configuration |
|---|---|---|---|
| **Log Analytics Workspace** | `Microsoft.OperationalInsights/workspaces` | `monitoring.bicep` | 30-day retention, `PerGB2018` SKU |
| **Application Insights** | `Microsoft.Insights/components` | `monitoring.bicep` | Web application mode, linked to Log Analytics |
| **Storage Account** | `Microsoft.Storage/storageAccounts` | `storage.bicep` | Standard LRS, StorageV2, HTTPS only, TLS 1.2 |
| **Blob Container** | `Microsoft.Storage/.../blobServices/containers` | `storage.bicep` | Name: `documents`, private access |
| **Cosmos DB Account** | `Microsoft.DocumentDB/databaseAccounts` | `cosmos.bicep` | API: NoSQL, Session consistency, Serverless or 400 RU/s |
| **Cosmos DB Database** | `Microsoft.DocumentDB/.../sqlDatabases` | `cosmos.bicep` | Name: `factoryguard` |
| **Cosmos DB Containers** | `Microsoft.DocumentDB/.../containers` | `cosmos.bicep` | `machines` (`/id`), `telemetry` (`/machineId`), `incidents` (`/machineId`), `documents` (`/machineId`) |
| **Functions Hosting Plan** | `Microsoft.Web/serverfarms` | `functions.bicep` | Linux Consumption (`Y1`), dynamic tier |
| **Function App** | `Microsoft.Web/sites` | `functions.bicep` | Linux, Node.js 24 LTS (`NODE\|24-lts`), Functions v4, wired to Cosmos DB & Storage |
| **App Service Plan** | `Microsoft.Web/serverfarms` | `appservice.bicep` | Dedicated Linux Plan, SKU: `B1` Basic |
| **App Service Web App** | `Microsoft.Web/sites` | `appservice.bicep` | Linux, Node.js 24 LTS (`NODE\|24-lts`), Next.js runtime, wired to Functions & Cosmos DB |

---

## Deployment Instructions

### Prerequisites
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) (v2.50+)
- [Bicep CLI](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/install) (bundled with Azure CLI: `az bicep version`)
- Active Azure subscription with Owner or Contributor role

### Step 1: Authenticate with Azure
```bash
az login
az account set --subscription "<your-subscription-id-or-name>"
```

### Step 2: Create the Target Resource Group
```bash
az group create \
  --name rg-factoryguard-workshop \
  --location eastus
```

### Step 3: Preview Changes (What-If Deployment)
```bash
az deployment group what-if \
  --resource-group rg-factoryguard-workshop \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

### Step 4: Execute Automated Deployment
```bash
az deployment group create \
  --resource-group rg-factoryguard-workshop \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json
```

### Step 5: Capture Deployment Outputs
Upon completion, Bicep outputs all deployed endpoints:
```json
{
  "appServiceUrl": {
    "type": "String",
    "value": "https://app-factoryguard-workshop-abc123.azurewebsites.net"
  },
  "functionAppUrl": {
    "type": "String",
    "value": "https://func-factoryguard-workshop-abc123.azurewebsites.net"
  },
  "cosmosEndpoint": {
    "type": "String",
    "value": "https://cosmos-factoryguard-workshop-abc123.documents.azure.com:443/"
  },
  "storageAccountName": {
    "type": "String",
    "value": "stfactoryguardworkshopabc123"
  },
  "appInsightsName": {
    "type": "String",
    "value": "appi-factoryguard-workshop-abc123"
  }
}
```

---

## Deploying Application Code

Once the Bicep template provisions the cloud infrastructure, deploy the application code:

### 1. Deploy the Functions Backend
```bash
# Verify the lightweight deployment package (~56 KB)
npm run verify:functions

# Deploy using VS Code Azure Functions extension:
# Right click "functions" folder -> "Deploy to Function App..." -> Select your function app name.
```

### 2. Deploy the Next.js Frontend
```bash
az webapp up \
  --name <appServiceName-from-bicep-output> \
  --resource-group rg-factoryguard-workshop \
  --runtime "NODE:24-lts"
```

---

## Parameter Customization

Parameters in `infra/main.parameters.json`:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `environment` | `string` | `'workshop'` | Target environment tag (`workshop`, `dev`, `staging`, `prod`) |
| `namePrefix` | `string` | `'factoryguard'` | Base naming prefix for all resources |
| `cosmosUseServerless` | `bool` | `true` | `true` for pay-per-request serverless, `false` for 400 RU/s provisioned |
| `appServiceSku` | `string` | `'B1'` | App Service Plan SKU (`F1`, `B1`, `S1`, `P1v3`) |
| `appServiceTier` | `string` | `'Basic'` | App Service Plan pricing tier (`Free`, `Basic`, `Standard`, `PremiumV3`) |

---

## Teardown / Cleanup

To delete all provisioned resources and stop any Azure consumption:
```bash
az group delete --name rg-factoryguard-workshop --yes --no-wait
```
