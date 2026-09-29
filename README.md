# FactoryGuard

**Intelligent Industrial Operations & Predictive Maintenance Platform**

FactoryGuard is an enterprise-grade, cloud-native industrial monitoring and predictive maintenance platform built on Microsoft Azure. Designed for high-reliability manufacturing and machining environments, FactoryGuard delivers real-time telemetry processing, deterministic multi-signal anomaly detection, automated incident lifecycles, and technical document archiving across industrial plant equipment.

---

## 1. Key Capabilities

- **Real-Time Machinery Telemetry**: Continuous monitoring of spindle temperatures, tri-axial vibration, system pressure, and machine operating hours across industrial production lines.
- **Deterministic Anomaly & Threat Detection**: Multi-signal rules engine that classifies operating telemetry against calibrated safety envelopes (Normal, Warning, Critical) with automatic compound fault detection.
- **Incident Lifecycle Management**: Real-time operational incident alerting with automatic deduplication, telemetry snapshots, and automated incident resolution upon equipment recovery.
- **Industrial Simulation Studio**: Built-in interactive scenario generator enabling operational stress testing, threshold evaluation, and telemetry validation (`NORMAL`, `WARNING`, `CRITICAL`, `RECOVERY`).
- **Technical Document Vault**: Integrated document repository providing signed, short-lived SAS access to equipment operating manuals, calibration SOPs, and inspection reports in Azure Blob Storage.
- **Fleet & Line Performance Analytics**: High-density plant overview dashboard tracking fleet health scores, production line status distributions, and active alert streams.
- **Enterprise Observability**: End-to-end telemetry logging, execution metrics, and diagnostics integrated with Azure Application Insights.
- **Zero-Touch Azure Provisioning**: Automatically initializes Cosmos DB databases, partitioned containers, machine registries, and Blob Storage documentation upon initial connection.

---

## 2. Cloud Architecture

FactoryGuard combines five core Azure services into a cohesive, highly scalable industrial IoT architecture:

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
                                  |   • Industrial Web Dashboard       |
                                  |   • REST API Gateway               |
                                  +-----------------+------------------+
                                                    |
                                    Internal Proxy  |  Server-to-Server
                                                    v
                                  +------------------------------------+
                                  |          Azure Functions           |
                                  |   Serverless Telemetry Ingestion   |
                                  |   • Rule-Based Anomaly Engine      |
                                  |   • Incident Transition Logic      |
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
                                  |   • Event & Diagnostic Telemetry   |
                                  |   • Latency & Exception Tracing    |
                                  +------------------------------------+
```

### Azure Services & Roles

| Azure Service | Role in FactoryGuard |
|---|---|
| **Azure App Service** | Hosts the Next.js 14 web application, real-time control room dashboard, and API endpoints. |
| **Azure Functions** | Serverless telemetry processing, deterministic anomaly threshold evaluation, and state transitions. |
| **Azure Cosmos DB** | Globally scalable NoSQL persistence for machinery registries, time-series telemetry events, and incident logs. |
| **Azure Blob Storage** | Secure object storage for machine manuals, calibration standards, and inspection documentation. |
| **Azure Application Insights** | Distributed tracing, execution metrics, error logging, and performance auditing. |

---

## 3. Anomaly Detection & Operating Envelopes

FactoryGuard implements deterministic domain rules to detect equipment degradation before physical failure occurs:

### Metric Operating Bands

| Metric | Normal Range | Warning Range | Critical Range | Units |
|---|---|---|---|---|
| **Temperature** | 45.0 – 70.0 | 70.1 – 90.0 | > 90.0 | °C |
| **Vibration** | 0.0 – 6.0 | 6.1 – 10.0 | > 10.0 | mm/s |
| **Pressure** | 90.0 – 110.0 | 110.1 – 118.0 | > 118.0 | PSI |

### Anomaly Classification Logic

- **NORMAL**: All metrics operate within normal limits. Health score: **80 – 100**.
- **WARNING**: One or two metrics enter the warning threshold, or minor degradation is detected. Health score: **50 – 79**.
- **CRITICAL**: Any metric crosses into the critical threshold, **OR** all three metrics enter warning levels simultaneously (compound multi-signal failure). Health score: **0 – 49**.
- **Automated Incident Lifecycle**: Anomaly detection creates an incident record with a telemetry snapshot. Subsequent events for the same equipment update existing open incidents to eliminate notification spam. When telemetry returns to normal, open incidents are automatically resolved.

---

## 4. Repository Structure

```text
FactoryGuard/
├── app/                                 # Next.js App Router (Dashboard & API Endpoints)
│   ├── (dashboard)/                     # Operations UI layouts and views
│   │   ├── page.tsx                     # Plant Overview Dashboard
│   │   ├── machines/
│   │   │   ├── page.tsx                 # Machinery Fleet & Registry
│   │   │   └── [machineId]/page.tsx     # Machine Operational Detail & Real-Time Charts
│   │   ├── incidents/page.tsx           # Incident & Alert Management Center
│   │   ├── simulation/page.tsx          # Industrial Simulation Studio
│   │   ├── documents/page.tsx           # Machine Documentation Library
│   │   └── system/page.tsx              # Cloud Architecture & Health Diagnostics
│   ├── api/                             # REST API Endpoints
│   │   ├── health/route.ts              # GET /api/health
│   │   ├── dashboard/summary/route.ts   # GET /api/dashboard/summary
│   │   ├── machines/route.ts            # GET /api/machines
│   │   ├── machines/[machineId]/route.ts # GET /api/machines/:machineId
│   │   ├── machines/[machineId]/telemetry/route.ts # GET /api/machines/:machineId/telemetry
│   │   ├── incidents/route.ts           # GET /api/incidents
│   │   ├── incidents/[incidentId]/route.ts # GET /api/incidents/:incidentId
│   │   ├── simulations/events/route.ts  # POST /api/simulations/events
│   │   ├── simulations/reset/route.ts   # POST /api/simulations/reset
│   │   ├── documents/route.ts           # GET /api/documents
│   │   └── documents/[documentId]/download-url/route.ts # GET /api/documents/:documentId/download-url
│   ├── globals.css                      # Industrial dark theme styling
│   └── layout.tsx                       # Root layout & navigation shell
├── components/                          # Reusable UI Components
│   ├── shell/                           # Header, Sidebar, QuickSimulationBar
│   ├── telemetry/                       # Real-time SVG time-series charts (Temp, Vibration, Pressure)
│   └── ui/                              # Industrial UI components (Gauges, Badges, Cards, Skeletons)
├── lib/                                 # Shared Domain, Data Repositories & Services
│   ├── config/env.ts                    # Centralized environment configuration
│   ├── domain/                          # Business logic isolated from UI & SDKs
│   │   ├── types.ts                     # TypeScript interfaces and data models
│   │   ├── thresholds.ts                # Sensor operating thresholds
│   │   ├── anomaly-engine.ts            # Threshold evaluation rules & health scoring
│   │   └── simulation-engine.ts         # Deterministic scenario generator
│   ├── data/                            # Cosmos DB data access layer
│   │   ├── interfaces.ts                # Repository contracts
│   │   ├── cosmos/                      # Azure Cosmos DB repository implementations
│   │   │   ├── index.ts                 # Cosmos machine, telemetry, incident, doc repos
│   │   │   └── provisioner.ts           # Automated database & container provisioner
│   │   └── factory.ts                   # Repository factory
│   ├── storage/                         # Azure Blob Storage client with SAS generation
│   ├── observability/                   # Application Insights client & structured logging
│   └── services/                        # Application domain services
├── functions/                           # Azure Functions v4 (TypeScript)
│   ├── src/
│   │   ├── index.ts                     # Serverless HTTP Trigger endpoints
│   │   └── domain.ts                    # Serverless anomaly engine & threshold evaluation
│   ├── host.json
│   ├── package.json
│   └── tsconfig.json
├── data/seed/                           # Industrial Seed Dataset
│   ├── machines.json                    # 24 machines across 4 production lines
│   ├── telemetry.json                   # Time-series baseline telemetry
│   ├── incidents.json                   # Historical & active incidents
│   ├── documents.json                   # Machine manual & SOP metadata
│   └── sample-docs/                     # PDF and text technical manuals
├── tests/                               # Test Suites
│   ├── unit/                            # Anomaly engine, health scores, simulation generator
│   ├── integration/                     # Application services & repository tests
│   └── acceptance/                      # End-to-end platform acceptance test
├── scripts/
│   └── seed-cosmos.ts                   # Azure Cosmos DB and Blob Storage manual seeding utility
├── .env.example                         # Configuration template
├── package.json                         # Dependencies & scripts
└── tsconfig.json                        # TypeScript compiler options
```

---

## 5. Getting Started & Deployment

FactoryGuard is designed as an Azure cloud-native platform. Simply provide your Azure resource credentials in `.env` (or in Azure App Service Configuration), and the application **automatically provisions the Cosmos DB database and containers, auto-seeds all 24 machinery records and telemetry history, and uploads technical manuals to Azure Blob Storage** on first connection—zero manual database or container creation required!

### Prerequisites:
- **Node.js**: v24.x LTS (tested on Node 24.21.0)
- **npm**: v11.x+ (bundled with Node 24)
- **Azure Subscription**: Resource group with Cosmos DB (NoSQL) and Storage Account

### Local Development Setup:

```bash
# 1. Clone the repository
git clone https://github.com/Git-ARoy/FactoryGuard.git
cd FactoryGuard

# 2. Use Node.js 24 LTS
nvm use 24

# 3. Copy the environment configuration template
cp .env.example .env

# 4. Configure your Azure credentials in .env
# COSMOS_ENDPOINT, COSMOS_KEY, STORAGE_CONNECTION_STRING

# 5. Install dependencies & run development server
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Environment Configuration

All environment variables are declared in `.env.example`:

| Variable | Description | Example |
|---|---|---|
| `APP_ENV` | Application environment | `production` / `development` |
| `APP_VERSION` | Application build version | `1.0.0` |
| `PORT` | Web server port | `3000` |
| `COSMOS_ENDPOINT` | Azure Cosmos DB URI | `https://<account>.documents.azure.com:443/` |
| `COSMOS_KEY` | Azure Cosmos DB Primary Key | `<key>` |
| `COSMOS_DATABASE` | Database name | `factoryguard` |
| `COSMOS_MACHINES_CONTAINER` | Machines container | `machines` (partition key: `/id`) |
| `COSMOS_TELEMETRY_CONTAINER` | Telemetry container | `telemetry` (partition key: `/machineId`) |
| `COSMOS_INCIDENTS_CONTAINER` | Incidents container | `incidents` (partition key: `/machineId`) |
| `COSMOS_DOCUMENTS_CONTAINER` | Documents container | `documents` (partition key: `/machineId`) |
| `STORAGE_ACCOUNT_URL` | Azure Blob Storage URL | `https://<account>.blob.core.windows.net` |
| `STORAGE_CONNECTION_STRING` | Azure Storage Connection String | `DefaultEndpointsProtocol=https;...` |
| `STORAGE_CONTAINER_NAME` | Blob container name | `documents` |
| `FUNCTION_BASE_URL` | Azure Functions API base URL | `http://localhost:7071` *(optional internal proxy)* |
| `FUNCTION_INTERNAL_SECRET` | Azure Functions access key | `<key>` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | `InstrumentationKey=...` |
| `SIMULATION_DEFAULT_MACHINE_ID` | Default demo machine identifier | `CNC-02` |

---

## 7. Cloud Deployment to Azure

> [!TIP]
> **Complete Workshop Guide**: For a comprehensive, step-by-step walkthrough detailing how to provision each Azure resource in the Azure Portal and deploy both the Functions backend and App Service frontend from VS Code, consult **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### 1. Azure Resources:
- **Resource Group**: `rg-factoryguard-workshop`
- **Azure Application Insights**: Enterprise distributed tracing & metrics
- **Azure Storage Account**: Standard general-purpose v2 (LRS)
- **Azure Cosmos DB**: NoSQL account (Serverless or Provisioned)
- **Azure Function App**: Linux, Node.js 24 LTS (Consumption or Flex)
- **Azure App Service**: Linux, Node.js 24 LTS (B1 or Free F1)

### 2. Zero-Touch Database & Storage Provisioning:
Manual database or container creation in the Azure Portal is **not required**. FactoryGuard automatically initializes its cloud data stores:
- Upon connecting to Azure Cosmos DB, the application automatically creates the `factoryguard` database and all 4 partitioned containers (`machines`, `telemetry`, `incidents`, `documents`), and seeds the 24 industrial machinery records, baseline telemetry history, initial incidents, and document metadata.
- Upon connecting to Azure Blob Storage, it automatically provisions the `documents` container and uploads all technical manuals.

To manually re-seed or verify your Azure database via CLI:
```bash
npm run seed:cosmos
```

### 3. Deploying Azure Functions (Backend API):
1. Validate deployment package sizing and configuration:
   ```bash
   npm run verify:functions
   ```
   *(Ensures package is ~56 KB without node_modules, preventing Kudu central directory errors)*
2. In VS Code, open the Azure Functions extension tab, right-click the `functions` folder, and select **Deploy to Function App...**.
3. Configure Application Settings in the Azure Portal (see [DEPLOYMENT.md](DEPLOYMENT.md#step-7-configure-function-app-application-settings)).

### 4. Deploying Azure App Service (Frontend):
Deploy via VS Code Azure App Service extension or Azure CLI:
```bash
az webapp up \
  --name <your-app-service-name> \
  --resource-group rg-factoryguard-workshop \
  --runtime "NODE:24-lts"
```

Configure Application Settings in the Azure Portal (see [DEPLOYMENT.md](DEPLOYMENT.md#step-9-configure-app-service-application-settings)).

---

## 8. Testing & Validation

```bash
# Run unit, integration, and acceptance tests (22 tests)
npm test

# Run TypeScript type check
npm run typecheck

# Verify Next.js production build
npm run build

# Verify Azure Functions build & deployment package
npm run verify:functions
```

---

## 9. Troubleshooting

Consult the [Detailed Troubleshooting Runbook](DEPLOYMENT.md#6-troubleshooting--diagnostic-runbook) for full diagnostic steps on:
- **Kudu Central Directory / Zip Package Size**: Prevented by `functions/.funcignore` and verified with `npm run verify:functions`.
- **`func: command not found`**: Local Core Tools are unnecessary; VS Code remote build is utilized.
- **Cosmos DB Firewall**: Enable "Accept connections from within public Azure data centers".
- **Blob Storage 403 Forbidden**: Confirm connection string account key and container name.
- **Node.js Runtime Version**: Ensure both Function App and App Service are configured for **Node.js 24 LTS**.
- **Port In Use (Local)**: Specify an alternate port when running locally: `PORT=3001 npm run dev`.
