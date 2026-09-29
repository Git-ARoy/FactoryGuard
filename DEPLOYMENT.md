# FactoryGuard - Production Deployment & Workshop Guide

**Comprehensive Hands-On Azure Deployment Guide for Students and Engineers**  
*Phase A: Manual Azure Cloud Deployment*

---

## Table of Contents

1. [Architecture & Deployment Model](#1-architecture--deployment-model)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Phase A: Step-by-Step Manual Deployment](#3-phase-a-step-by-step-manual-deployment)
   - [Step 1: Resource Group](#step-1-create-resource-group)
   - [Step 2: Azure Application Insights](#step-2-create-application-insights)
   - [Step 3: Azure Storage Account](#step-3-create-storage-account)
   - [Step 4: Azure Cosmos DB for NoSQL](#step-4-create-azure-cosmos-db)
   - [Step 5: Azure Function App (Backend API)](#step-5-create-azure-function-app)
   - [Step 6: Deploy Functions Backend via VS Code](#step-6-deploy-functions-backend-via-vs-code)
   - [Step 7: Configure Function App Settings](#step-7-configure-function-app-application-settings)
   - [Step 8: Azure App Service (Next.js Frontend)](#step-8-create-azure-app-service)
   - [Step 9: Configure App Service Settings](#step-9-configure-app-service-application-settings)
   - [Step 10: Deploy Next.js Frontend](#step-10-deploy-nextjs-frontend-to-app-service)
4. [15-Point Operational Smoke Test](#4-15-point-operational-smoke-test)
5. [Workshop Teardown](#5-workshop-teardown)
6. [Troubleshooting & Diagnostic Runbook](#6-troubleshooting--diagnostic-runbook)

---

## 1. Architecture & Deployment Model

FactoryGuard is an enterprise-grade industrial predictive maintenance platform. The workshop follows a two-phase pedagogical model:

- **Phase A (Manual Deployment - Current Phase)**: Students provision Azure services through the Azure Portal and deploy code using VS Code. Students **do not** manually create Cosmos DB databases, containers, or Blob containers—the application code provisions and seeds these automatically upon initial boot.
- **Phase B (Infrastructure as Code - Second Phase)**: Only after understanding cloud architecture hands-on do students introduce Bicep to automate resource creation.

```text
                                  +------------------------------------+
                                  |         Operator's Browser         |
                                  +-----------------+------------------+
                                                    |
                                             HTTPS  |
                                                    v
                                  +------------------------------------+
                                  |         Azure App Service          |
                                  | Next.js 14 App Router (Node 24 LTS)|
                                  |   • Real-Time Operations UI        |
                                  |   • Next.js API Gateway            |
                                  +-----------------+------------------+
                                                    |
                                    Internal Proxy  |  Server-to-Server
                                                    v
                                  +------------------------------------+
                                  |          Azure Functions           |
                                  |  v4 Programming Model (TypeScript) |
                                  |   • Telemetry Ingestion API        |
                                  |   • Anomaly Evaluation Engine      |
                                  |   • Incident Lifecycle Automation  |
                                  +--------+------------------+--------+
                                           |                  |
                                           v                  v
                    +------------------------------+  +----------------------------+
                    |   Azure Cosmos DB (NoSQL)    |  |     Azure Blob Storage     |
                    |   • machines    (/id)        |  |   • Technical manuals      |
                    |   • telemetry   (/machineId) |  |   • Maintenance SOPs       |
                    |   • incidents   (/machineId) |  |   • Inspection reports     |
                    |   • documents   (/machineId) |  |   (Short-lived signed SAS) |
                    +------------------------------+  +----------------------------+
                                           ^                  ^
                                           |                  |
                                  +--------+------------------+--------+
                                  |     Azure Application Insights     |
                                  |   • End-to-End Distributed Tracing |
                                  |   • Metrics, Logs & Anomaly Alerts |
                                  +------------------------------------+
```

---

## 2. Prerequisites & Environment Setup

Before starting the workshop, ensure the following tools are installed locally:

| Requirement | Supported Version | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | **24.x LTS** | `node -v` (e.g. `v24.21.0`) | **Required**: Must be Node.js 24 LTS |
| **npm** | **11.x+** | `npm -v` | Bundled with Node 24 |
| **Git** | **2.30+** | `git --version` | Source control |
| **VS Code** | Latest | `code -v` | Primary workshop IDE |
| **Azure Tools Extension** | Latest | `ms-vscode.vscode-node-azure-pack` | Extension for VS Code |
| **Azure Functions Extension** | Latest | `ms-azuretools.vscode-azurefunctions` | Extension for VS Code |
| **Azure App Service Extension** | Latest | `ms-azuretools.vscode-azureappservice` | Extension for VS Code |
| **Azure Account** | Active subscription | Azure Portal access | Free tier or student credits work |

> [!IMPORTANT]
> **Node.js 24 LTS Standard**: Ensure you are running Node.js 24 LTS locally (`nvm use 24` or `nvm install 24`). Both Azure Function App and Azure App Service must be created with the **Node 24 LTS** runtime.

---

## 3. Phase A: Step-by-Step Manual Deployment

Follow these steps in sequence. Record resource names and connection keys as you create each service.

### Step 1: Create Resource Group

1. Log into the [Azure Portal](https://portal.azure.com).
2. In the top search bar, type **Resource groups** and select it.
3. Click **+ Create**.
4. Configure settings:
   - **Subscription**: Select your active subscription.
   - **Resource group**: `rg-factoryguard-workshop` (or unique name e.g. `rg-factoryguard-<yourinitials>`).
   - **Region**: Choose a region close to you (e.g. `East US`, `West Europe`, `Southeast Asia`).
5. Click **Review + create** -> **Create**.

---

### Step 2: Create Application Insights

1. In the search bar, search for **Application Insights** and click **+ Create**.
2. Configure settings:
   - **Resource Group**: `rg-factoryguard-workshop`
   - **Name**: `appi-factoryguard`
   - **Region**: Same region as Resource Group (e.g. `East US`).
   - **Log Analytics Workspace**: Select the default workspace or allow Azure to create a new one.
3. Click **Review + create** -> **Create**.
4. Once deployed, navigate to the Application Insights resource. Under **Overview**, copy the **Connection String** and save it:
   ```text
   APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
   ```

---

### Step 3: Create Storage Account

1. Search for **Storage accounts** and click **+ Create**.
2. Configure settings:
   - **Resource Group**: `rg-factoryguard-workshop`
   - **Storage account name**: `stfactoryguard<unique>` (lowercase letters and numbers only, 3-24 characters, e.g. `stfactoryguard01`).
   - **Region**: Same region as Resource Group.
   - **Performance**: Standard
   - **Redundancy**: Locally-redundant storage (LRS) *(cost-efficient for workshops)*.
3. Under **Advanced** tab:
   - Ensure **Allow cross-tenant replication** is unchecked.
   - Ensure **Blob public access** is disabled (FactoryGuard uses secure signed SAS tokens).
4. Click **Review + create** -> **Create**.
5. Once deployment completes, navigate to **Security + networking** > **Access keys**.
6. Under `key1`, click **Show** next to **Connection string** and copy the full connection string:
   ```text
   STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
   ```

> [!NOTE]
> **No Manual Container Creation Needed**: You do **not** need to create the `documents` container manually. FactoryGuard automatically creates the container and uploads sample manuals and SOPs on first launch.

---

### Step 4: Create Azure Cosmos DB

1. Search for **Azure Cosmos DB** and click **+ Create**.
2. On the **Select API option** card, select **Azure Cosmos DB for NoSQL** -> click **Create**.
3. Configure settings:
   - **Resource Group**: `rg-factoryguard-workshop`
   - **Account Name**: `cosmos-factoryguard-<unique>` (e.g. `cosmos-factoryguard-01`).
   - **Location**: Same region as Resource Group.
   - **Capacity mode**: **Serverless** (recommended for workshops: pay only for RUs consumed) OR **Provisioned throughput** with Free Tier discount enabled.
4. Under the **Networking** tab:
   - **Connectivity method**: All networks (Public network access).
   - Check **Allow access from Azure Portal**.
   - Check **Accept connections from within public Azure data centers (Azure services and resources)**.
5. Click **Review + create** -> **Create** *(Cosmos DB takes ~2-4 minutes to provision)*.
6. Once deployed, open the Cosmos DB account:
   - In the left menu, select **Keys**.
   - Copy **URI** -> `COSMOS_ENDPOINT` (e.g. `https://cosmos-factoryguard-01.documents.azure.com:443/`).
   - Copy **PRIMARY KEY** -> `COSMOS_KEY`.

> [!IMPORTANT]
> **Zero Manual Database/Container Creation**: Do **not** create any database or containers in the Cosmos DB Data Explorer! FactoryGuard features an autonomous provisioning engine (`ensureCosmosDatabaseAndContainers`) that automatically creates the `factoryguard` database and all 4 partitioned containers (`machines`, `telemetry`, `incidents`, `documents`) and seeds the baseline dataset on first request.

---

### Step 5: Create Azure Function App

1. Search for **Function App** and click **+ Create**.
2. Select **Consumption** plan (or **Flex Consumption**).
3. Configure the **Basics** tab:
   - **Resource Group**: `rg-factoryguard-workshop`
   - **Function App name**: `func-factoryguard-<unique>` (e.g. `func-factoryguard-01`).
   - **Do you want to deploy code or container image?**: **Code**
   - **Runtime stack**: **Node.js**
   - **Version**: **24 LTS**
   - **Operating System**: **Linux**
   - **Region**: Same region as Resource Group.
4. Under the **Storage** tab:
   - **Storage account**: Select the storage account created in Step 3 (`stfactoryguard<unique>`).
5. Under the **Monitoring** tab:
   - **Enable Application Insights**: **Yes**
   - **Application Insights**: Select `appi-factoryguard` created in Step 2.
6. Click **Review + create** -> **Create**.

---

### Step 6: Deploy Functions Backend via VS Code

FactoryGuard includes a pre-configured `.funcignore` file that strictly excludes `node_modules/`, preventing the 69+ MB deployment payload failure (*InvalidPackageContentException: Offset to Central Directory cannot be held in an Int64*). Azure uses **remote build** to install dependencies and execute `tsc`.

1. Open the FactoryGuard repository in VS Code:
   ```bash
   cd ~/Documents/FactoryGuard
   code .
   ```
2. Verify package configuration before deployment by running our built-in verifier:
   ```bash
   npm run verify:functions
   ```
   *Output must indicate clean compilation and a deployment package size of ~56 KB.*
3. In VS Code, click the **Azure** icon in the activity bar (left rail).
4. Sign in to your Azure account if prompted.
5. Under **RESOURCES**, expand your subscription -> expand **Function App**.
6. Locate your Function App: `func-factoryguard-<unique>`.
7. **Deploying the Functions Subfolder**:
   - In the VS Code File Explorer, right-click on the `functions` folder.
   - Select **Deploy to Function App...** (or click the blue deploy arrow in the Azure Functions pane and choose the `functions` folder).
   - Select your Function App name (`func-factoryguard-<unique>`).
   - If prompted: "Are you sure you want to deploy to ...? This will overwrite any previous deployment", click **Deploy**.
8. Monitor the **Output** window (Azure Functions tab). You will see:
   ```text
   Starting deployment...
   Creating zip package...
   Zip package size: ~56 KB
   Uploading package to storage...
   Deployment successful.
   ```

---

### Step 7: Configure Function App Application Settings

The serverless Functions API needs connection details for Cosmos DB and Application Insights.

1. In the [Azure Portal](https://portal.azure.com), navigate to your Function App: `func-factoryguard-<unique>`.
2. In the left navigation, select **Settings** > **Environment variables** (or **Configuration** on older UI).
3. Under the **App settings** tab, click **+ Add** to insert each of the following keys:

| Name | Value | Description |
|---|---|---|
| `COSMOS_ENDPOINT` | `https://cosmos-factoryguard-01.documents.azure.com:443/` | Cosmos DB Account URI |
| `COSMOS_KEY` | `<your-cosmos-primary-key>` | Cosmos DB Primary Key |
| `COSMOS_DATABASE` | `factoryguard` | Database name |
| `COSMOS_MACHINES_CONTAINER` | `machines` | Machine registry container |
| `COSMOS_TELEMETRY_CONTAINER` | `telemetry` | Telemetry timeseries container |
| `COSMOS_INCIDENTS_CONTAINER` | `incidents` | Incidents container |
| `COSMOS_DOCUMENTS_CONTAINER` | `documents` | Documents container |
| `STORAGE_CONNECTION_STRING` | `<your-storage-connection-string>` | Azure Storage connection string |
| `STORAGE_CONTAINER_NAME` | `documents` | Blob container name |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `<your-app-insights-connection-string>` | Azure App Insights connection |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Enables remote npm install & tsc build |

4. Click **Apply** -> **Confirm** to save the settings. The Function App will automatically restart.
5. **Verify Backend Health**:
   - Open a browser or terminal and test the health endpoint:
     ```bash
     curl -i https://<your-function-app-name>.azurewebsites.net/api/health
     ```
   - **Expected response**:
     ```json
     {
       "status": "ok",
       "service": "factoryguard-functions",
       "version": "1.0.0",
       "cosmos": "connected",
       "timestamp": "2026-09-30T..."
     }
     ```
   *(On this first call, Cosmos DB will automatically be created and seeded with 24 machines!)*

---

### Step 8: Create Azure App Service

1. In the Azure Portal search bar, search for **App Services** and click **+ Create** -> **Web App**.
2. Configure the **Basics** tab:
   - **Resource Group**: `rg-factoryguard-workshop`
   - **Name**: `app-factoryguard-<unique>` (e.g. `app-factoryguard-01`).
   - **Publish**: **Code**
   - **Runtime stack**: **Node 24 LTS**
   - **Operating System**: **Linux**
   - **Region**: Same region as Resource Group.
   - **Pricing Plan**: **Basic B1** (or **Free F1** / **Standard S1**).
3. Under the **Monitoring** tab:
   - **Enable Application Insights**: **Yes**
   - **Application Insights**: Select `appi-factoryguard`.
4. Click **Review + create** -> **Create**.

---

### Step 9: Configure App Service Application Settings

1. Once deployment finishes, navigate to the App Service resource: `app-factoryguard-<unique>`.
2. In the left navigation, select **Settings** > **Environment variables** (or **Configuration**).
3. Under the **App settings** tab, add the following variables:

| Name | Value | Description |
|---|---|---|
| `PORT` | `3000` | Next.js server port |
| `NODE_ENV` | `production` | Production environment flag |
| `COSMOS_ENDPOINT` | `https://cosmos-factoryguard-01.documents.azure.com:443/` | Cosmos DB Account URI |
| `COSMOS_KEY` | `<your-cosmos-primary-key>` | Cosmos DB Primary Key |
| `COSMOS_DATABASE` | `factoryguard` | Database name |
| `STORAGE_CONNECTION_STRING` | `<your-storage-connection-string>` | Azure Storage connection string |
| `STORAGE_CONTAINER_NAME` | `documents` | Blob container name |
| `FUNCTION_BASE_URL` | `https://func-factoryguard-01.azurewebsites.net` | Backend Function App URL |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `<your-app-insights-connection-string>` | Azure App Insights connection |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `true` | Builds Next.js during Oryx deployment |

4. Under **Configuration** > **General settings** (if applicable on Linux App Service):
   - **Startup Command**: `node_modules/.bin/next start` or `npm run start`
5. Click **Apply** -> **Confirm**.

---

### Step 10: Deploy Next.js Frontend to App Service

Deploy the Next.js root project to Azure App Service using your preferred method:

#### Option A: Using VS Code Azure App Service Extension (Recommended for Workshop)
1. In VS Code, open the **Azure** activity tab.
2. Under **RESOURCES**, expand your subscription -> expand **App Services**.
3. Right-click on your Web App: `app-factoryguard-<unique>`.
4. Select **Deploy to Web App...**.
5. Select the root workspace folder: `FactoryGuard`.
6. When prompted to confirm overwrite, click **Deploy**.
7. VS Code will zip and upload the project. Azure Oryx will execute `npm install` and `npm run build` remotely.

#### Option B: Using Azure CLI
```bash
cd ~/Documents/FactoryGuard
az webapp up \
  --name app-factoryguard-<unique> \
  --resource-group rg-factoryguard-workshop \
  --runtime "NODE:24-lts"
```

Once deployment completes, open your browser and navigate to:
```text
https://app-factoryguard-<unique>.azurewebsites.net
```
You will be greeted by the FactoryGuard Industrial Operations Dashboard!

---

## 4. 15-Point Operational Smoke Test

Execute this 15-point checklist to thoroughly validate the end-to-end cloud deployment:

| # | Checkpoint | Method / Action | Expected Result | Pass? |
|---|---|---|---|:---:|
| **1** | **Function App Health** | `curl -i https://<func-app>.azurewebsites.net/api/health` | HTTP `200 OK` with `status: "ok"` and `cosmos: "connected"`. | [ ] |
| **2** | **App Service Health** | `curl -i https://<web-app>.azurewebsites.net/api/health` | HTTP `200 OK` with `status: "healthy"` and repository statuses. | [ ] |
| **3** | **Cosmos DB Autonomous Creation** | Open Azure Portal > Cosmos DB > **Data Explorer** | `factoryguard` database exists with 4 partitioned containers (`machines`, `telemetry`, `incidents`, `documents`). | [ ] |
| **4** | **Machinery Fleet Registry** | Cosmos DB Data Explorer > `machines` container > Items | Exactly **24 machine items** present across lines `L1`, `L2`, `L3`, `L4`. | [ ] |
| **5** | **Dashboard Overview** | Open `https://<web-app>.azurewebsites.net` in browser | Dashboard loads with industrial dark UI, active fleet health score, and 4 production lines. | [ ] |
| **6** | **Machinery Registry Page** | Click **Machines** in sidebar navigation | Displays all 24 machines with live status badges (`NORMAL`, `WARNING`, `CRITICAL`). | [ ] |
| **7** | **Machine Operational Detail** | Click on machine `CNC-02` (High-Speed Milling Machine) | Renders machine specifications, operating hours, and 3 SVG telemetry charts. | [ ] |
| **8** | **Telemetry History API** | `curl https://<func-app>.azurewebsites.net/api/machines/CNC-02/telemetry` | Returns JSON array of recent telemetry samples (temp, vibration, pressure). | [ ] |
| **9** | **Blob Storage Auto-Seeding** | Open Azure Portal > Storage Account > **Storage Browser** > Blob containers | `documents` container exists with technical manuals (e.g. `CNC-02-manual.pdf`). | [ ] |
| **10** | **Technical Document Vault & SAS** | In web app, navigate to **Documents** tab and click **Download** on `CNC-02-manual.pdf` | Generates short-lived Azure Blob SAS URL and downloads the document. | [ ] |
| **11** | **Simulation: Trigger Warning** | Navigate to **Simulation** tab. Select `CNC-02`, select **WARNING**, click **Send Telemetry Event** | Spindle temp rises to 78°C, machine transitions to `WARNING`, new incident is logged in Incident Center. | [ ] |
| **12** | **Incident Deduplication** | Trigger a second **WARNING** event on `CNC-02` | Anomaly engine updates the existing open incident with latest telemetry snapshot (no duplicate incident created). | [ ] |
| **13** | **Simulation: Trigger Critical** | Select `CNC-02`, select **CRITICAL**, click **Send Telemetry Event** | Vibration spikes to 12.8 mm/s, health score drops < 50, machine status updates to `CRITICAL`. | [ ] |
| **14** | **Simulation: Reset / Recovery** | Click **Reset Machine to Normal** for `CNC-02` | Spindle temp, vibration, and pressure return to calibrated baseline (health 96, status `NORMAL`). Open incident transitions to `RESOLVED` with resolution timestamp. | [ ] |
| **15** | **Application Insights Telemetry** | Open Azure Portal > Application Insights > **Live metrics** | Real-time incoming requests, Cosmos DB dependency calls, and custom traces are actively visualised. | [ ] |

---

## 5. Workshop Teardown

At the end of the workshop, clean up all cloud resources to prevent ongoing charges:

### Option A: Using the Azure Portal
1. Navigate to **Resource groups**.
2. Select `rg-factoryguard-workshop`.
3. Click **Delete resource group** in the top toolbar.
4. Type the resource group name to confirm and click **Delete**.
5. All 5 services (App Service, Functions, Cosmos DB, Storage Account, App Insights) will be permanently and cleanly deleted together.

### Option B: Using Azure CLI
```bash
az group delete --name rg-factoryguard-workshop --yes --no-wait
```

---

## 6. Troubleshooting & Diagnostic Runbook

### Issue 1: Kudu Zip Deployment Failure (`InvalidPackageContentException`)
- **Symptom**: During VS Code deployment, the output logs show:
  ```text
  Zip package size: 69.2 MB ...
  InvalidPackageContentException: Package content validation failed: Offset to Central Directory cannot be held in an Int64.
  Deployment failed.
  ```
- **Root Cause**: The local `node_modules` folder (~330 MB uncompressed) was bundled into the deployment zip because `functions/.funcignore` was missing or malformed.
- **Resolution**:
  1. Confirm `functions/.funcignore` exists and contains:
     ```text
     node_modules/
     local.settings.json
     .env*
     ```
  2. Run the deployment verification script before retrying:
     ```bash
     npm run verify:functions
     ```
  3. Ensure the reported zip size is ~**56 KB** (not 69 MB).
  4. Redeploy via VS Code.

---

### Issue 2: `func: command not found`
- **Symptom**: Student runs `func azure functionapp publish ...` and gets a command not found error.
- **Root Cause**: Azure Functions Core Tools CLI (`func`) is not installed on the student's machine.
- **Resolution**: You do **not** need Azure Functions Core Tools installed. FactoryGuard uses VS Code Azure Tools extension and Azure remote build (`SCM_DO_BUILD_DURING_DEPLOYMENT=true`). Simply deploy directly by right-clicking the `functions/` folder in VS Code and selecting **Deploy to Function App...**.

---

### Issue 3: Cosmos DB Connection Timeout / Firewall Block
- **Symptom**: Backend returns `503 Service Unavailable` with `cosmos: "failed"`:
  ```text
  Cosmos DB connection failed: Request originated from IP ... through public internet. Partner is not allowed.
  ```
- **Root Cause**: Cosmos DB firewall is blocking traffic from Azure Functions or local machine.
- **Resolution**:
  1. In the Azure Portal, open the Cosmos DB account.
  2. Navigate to **Security** > **Networking**.
  3. Under **Public network access**, ensure **All networks** is selected OR check:
     - **Accept connections from within public Azure data centers** (allows App Service & Functions).
     - **Add my current IP** (if testing locally).
  4. Click **Save** and wait 60 seconds for firewall rules to propagate.

---

### Issue 4: Blob Storage 403 Forbidden on Document Download
- **Symptom**: Clicking **Download** on a machine manual results in HTTP 403 or signature validation error.
- **Root Cause**: Storage account connection string is missing the account key, or system clock skew affected the SAS token.
- **Resolution**:
  1. Verify `STORAGE_CONNECTION_STRING` in App Service application settings contains `AccountKey=...`.
  2. FactoryGuard generates signed SAS tokens with a 5-minute pre-dated buffer (`new Date(Date.now() - 5 * 60 * 1000)`) to guard against cloud clock skew. Ensure `STORAGE_CONTAINER_NAME` matches `documents`.

---

### Issue 5: Node.js Version Runtime Mismatch
- **Symptom**: Function App logs `SyntaxError: Unexpected token ...` or fails during module loading.
- **Root Cause**: Function App or App Service was created with Node 18 or Node 20 instead of Node 24 LTS.
- **Resolution**:
  1. In Azure Portal, open your Function App > **Settings** > **Configuration**.
  2. Check `FUNCTIONS_EXTENSION_VERSION` is `~4` and `WEBSITE_NODE_DEFAULT_VERSION` is `~24`.
  3. For App Service, verify **General settings** > **Stack**: `Node`, **Node version**: `Node 24 LTS`.

---

*FactoryGuard Deployment Manual — Enterprise Industrial IoT on Microsoft Azure*
