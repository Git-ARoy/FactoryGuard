# FactoryGuard

**Intelligent Industrial Monitoring & Predictive Maintenance Platform**  
*Built for Azure LaunchPad 2026 • Microsoft Azure Developer Community Club*

---

> [!WARNING]
> **CRITICAL INFRASTRUCTURE RULE NOTICE**  
> This initial repository intentionally does **NOT** contain Azure Bicep infrastructure-as-code files (`main.bicep`, `modules/*.bicep`, etc.).  
> Infrastructure-as-code is deferred and will be introduced in a dedicated subsequent release. Do not generate or commit Bicep files to this repository version.

---

## 1. Project Overview

**FactoryGuard** is a cloud-native industrial operations and predictive maintenance monitoring platform. It simulates an advanced manufacturing plant where machinery continuously emits telemetry (spindle temperatures, tri-axial vibrations, fluid/coolant pressures, and operational hours). 

The platform gives plant operators and maintenance engineers a high-density, real-time control room dashboard to:
1. Monitor fleet-wide machine health and live sensor metrics.
2. Ingest continuous telemetry through serverless API gateways.
3. Evaluate deterministic anomaly thresholds and multi-signal conditions.
4. Persist durable operational state, time-series events, and incidents in **Azure Cosmos DB**.
5. Retrieve technical manuals, SOPs, and inspection reports from **Azure Blob Storage**.
6. Observe application diagnostics and structured logs via **Azure Application Insights**.
7. Execute deterministic **Workshop Demo Simulations** (`NORMAL`, `WARNING`, `CRITICAL`, `RECOVERY`) to demonstrate the complete cloud lifecycle.

---

## 2. Cloud Architecture

FactoryGuard brings five core Azure services together into one cohesive, industrial-grade architecture:

```text
                                  +------------------------------------+
                                  |         Operations Browser         |
                                  +-----------------+------------------+
                                                    |
                                             HTTPS  |
                                                    v
                                  +------------------------------------+
                                  |         Azure App Service          |
                                  | Next.js 14 App Router (Node 24 LTS) |
                                  |   • Industrial Web Dashboard       |
                                  |   • REST Presentation APIs         |
                                  +-----------------+------------------+
                                                    |
                                    Internal Proxy  |  Server-to-Server
                                                    v
                                  +------------------------------------+
                                  |          Azure Functions           |
                                  |   Serverless Telemetry Processing  |
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
                                  |   • Simulation Event Telemetry     |
                                  |   • Latency & Exception Tracing    |
                                  +------------------------------------+
```

### Service Responsibilities:

| Azure Service | Responsibility in FactoryGuard |
|---|---|
| **Azure App Service** | Hosts the web application, real-time operations dashboard, and REST API proxy. |
| **Azure Functions** | Serverless telemetry processing, deterministic anomaly threshold evaluation, and incident state updates. |
| **Azure Cosmos DB** | Managed NoSQL storage for fleet registries, time-series telemetry events, and active/resolved incidents. |
| **Azure Blob Storage** | Object storage for fictional machine operating manuals, calibration SOPs, and inspection PDFs. |
| **Application Insights** | End-to-end monitoring, dependency tracing, latency measurements, and structured event diagnostics. |

---

## 3. Repository Structure

```text
FactoryGuard/
├── app/                                 # Next.js App Router (Web Dashboard & API Gateway)
│   ├── (dashboard)/                     # Operations UI layouts and views
│   │   ├── page.tsx                     # Plant Overview Dashboard (FR-01)
│   │   ├── machines/
│   │   │   ├── page.tsx                 # Machinery Fleet & Registry (FR-02)
│   │   │   └── [machineId]/page.tsx     # Machine Operational Detail & Real-Time Charts (FR-03)
│   │   ├── incidents/page.tsx           # Incident & Alert Management Center (FR-07)
│   │   ├── simulation/page.tsx          # Workshop Simulation Studio (FR-08)
│   │   ├── documents/page.tsx           # Machine Documentation Library (FR-11)
│   │   └── system/page.tsx              # Cloud Architecture & Health Diagnostics (Goal 2)
│   ├── api/                             # REST APIs conforming to API_SPEC.md
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
│   └── layout.tsx                       # Root layout & shell providers
├── components/                          # Polished UI Components
│   ├── shell/                           # Header, Sidebar, QuickSimulationBar
│   ├── telemetry/                       # Real-time SVG time-series charts (Temp, Vibration, Pressure)
│   └── ui/                              # High-density industrial components (Badges, Gauges, Cards, Skeletons)
├── lib/                                 # Shared Domain, Data Repositories & Services
│   ├── config/env.ts                    # Centralized environment configuration
│   ├── domain/                          # Pure business logic isolated from UI & SDKs
│   │   ├── types.ts                     # TypeScript schemas matching ARCHITECTURE.md
│   │   ├── thresholds.ts                # Baseline operating bands (FR-05)
│   │   ├── anomaly-engine.ts            # Deterministic threshold rule engine & health scoring
│   │   └── simulation-engine.ts         # Deterministic scenario generators (Normal, Warning, Critical, Recovery)
│   ├── data/                            # Repository pattern abstraction
│   │   ├── interfaces.ts                # IMachineRepository, ITelemetryRepository, IIncidentRepository, IDocumentRepository
│   │   ├── cosmos/                      # Azure Cosmos DB SDK implementation
│   │   ├── local/                       # High-fidelity in-memory repository (local fallback)
│   │   └── factory.ts                   # Repository factory switching based on configuration
│   ├── storage/                         # Azure Blob Storage client with SAS token generation
│   ├── observability/                   # Application Insights client & structured logging
│   └── services/                        # Shared application services (Simulation, Dashboard, Machine, etc.)
├── functions/                           # Azure Functions v4 (TypeScript)
│   ├── src/
│   │   ├── index.ts                     # HTTP Trigger registrations
│   │   └── domain.ts                    # Serverless anomaly engine & threshold evaluation
│   ├── host.json
│   ├── package.json
│   └── tsconfig.json
├── data/seed/                           # Realistic Industrial Seed Dataset
│   ├── machines.json                    # 24 machines across 4 production lines
│   ├── telemetry.json                   # Time-series baseline telemetry
│   ├── incidents.json                   # Open & historical incident records
│   ├── documents.json                   # Machine manual & SOP metadata
│   └── sample-docs/                     # Fictional PDF/text manuals for Blob Storage
├── tests/                               # Comprehensive Test Suites
│   ├── unit/                            # Anomaly engine, health scores, simulation generator, deduplication
│   ├── integration/                     # Application services & repository integration
│   └── acceptance/                      # 10-step workshop demo acceptance test
├── scripts/
│   └── seed-cosmos.ts                   # Azure Cosmos DB and Blob Storage seeding script
├── .env.example                         # Safe configuration template
├── package.json                         # Dependencies & scripts
└── tsconfig.json                        # TypeScript compiler options
```

---

## 4. Getting Started: Cloud Deployment & Configuration

FactoryGuard is designed as an Azure cloud-native platform. Simply provide your Azure resource credentials in `.env` (or in Azure App Service Configuration), and the application **automatically provisions the Cosmos DB database and containers, auto-seeds all 24 machinery records and telemetry history, and uploads technical manuals to Azure Blob Storage** on first connection—zero manual database or container creation required!

### Prerequisites:
- **Node.js**: v24.x LTS (tested on Node 24.21.0)
- **npm**: v11.x+ (bundled with Node 24)
- **Azure Subscription**: Resource group with Cosmos DB (NoSQL) and Storage Account

### Quickstart:

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

Open [http://localhost:3000](http://localhost:3000) in your browser. FactoryGuard will auto-provision and connect to your Azure resources!

---

## 5. Environment Configuration

All environment variables are declared in `.env.example`:

| Variable | Description | Default / Example |
|---|---|---|
| `APP_ENV` | Application environment | `development` / `production` |
| `APP_VERSION` | Application build version | `1.0.0` |
| `PORT` | Local web server port | `3000` |
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
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | `InstrumentationKey=...` *(optional)* |
| `SIMULATION_DEFAULT_MACHINE_ID` | Default demo machine identifier | `CNC-02` |

---

## 6. Testing & Quality Checks

FactoryGuard includes comprehensive test suites across unit, integration, and end-to-end acceptance levels:

```bash
# Run unit and integration tests (Vitest)
npm test

# Run TypeScript typecheck (zero errors)
npm run typecheck

# Run production build
npm run build

# Compile Azure Functions
npx tsc -p functions/tsconfig.json
```

---

## 7. Workshop Simulation Guide (The 10-Minute Live Demo)

During **Azure LaunchPad 2026**, facilitators and participants can run this exact deterministic sequence:

1. **Open Dashboard**: Navigate to `/` and verify the plant overview summary cards (24 machines, status distribution, health score ~82).
2. **Select Demo Machine**: Notice **CNC-02** in the Quick Simulation Bar or navigate to `/machines/CNC-02`.
3. **Simulate Warning Event**: Click **"Simulate Warning"** on `CNC-02`.
   - Telemetry injected: `Temperature: 78.5°C`, `Vibration: 7.4 mm/s`, `Pressure: 106.8 PSI`.
   - Machine status transitions to **WARNING** (Health: 68/100).
   - An incident (`VIBRATION` / Warning) is created and visible in the active incident stream.
4. **Inspect Persistence**: Refresh the page (`F5`) or open in a new tab. The changed state and incident remain persisted in Cosmos DB!
5. **Deduplication Verification**: Trigger **"Simulate Warning"** again. Observe that the existing incident is updated with the new telemetry snapshot rather than spamming duplicate open alerts.
6. **Simulate Critical Event**: Click **"Simulate Critical"**.
   - Telemetry injected: `Temperature: 96.2°C`, `Vibration: 11.6 mm/s`, `Pressure: 119.5 PSI`.
   - Machine transitions to **CRITICAL** (Health: 28/100).
   - Critical Multi-Signal alert is opened.
7. **Inspect Real-Time Charts**: Scroll down to the telemetry trend chart to see the temperature, vibration, and pressure curves crossing the warning and critical threshold bands with interactive hover inspection.
8. **Inspect Technical Documents**: Click on the **CNC-02 Maintenance & Calibration Procedure.pdf** download button to test Blob Storage signed SAS token retrieval.
9. **Recover / Reset Unit**: Click **"Reset to Normal"**.
   - Unit returns to **NORMAL** (Health: ~96/100).
   - Active open incidents are automatically marked **RESOLVED**.
10. **Application Insights Verification**: Open the Azure Portal &rarr; Application Insights &rarr; Search &rarr; see structured events:
    - `FactoryGuard.SimulationTriggered`
    - `FactoryGuard.IncidentCREATED`
    - `FactoryGuard.IncidentRESOLVED`

---

## 8. Azure Cloud Deployment

### 1. Prerequisites in Azure:
- Resource Group: `rg-factoryguard-prod`
- App Service Plan: Linux B1 or higher (Node.js 24 LTS)
- Azure Cosmos DB for NoSQL account
- Azure Storage Account (standard general-purpose v2)
- Azure Function App (Node.js 24 LTS)
- Application Insights resource

### 2. Zero-Touch Automatic Database & Storage Provisioning:
You do **NOT** need to create the database, containers, or upload manuals manually in the Azure Portal! FactoryGuard is engineered with automatic cloud provisioning and auto-seeding:
- Upon connecting to Azure Cosmos DB, the application automatically creates the `factoryguard` database and all 4 partitioned containers (`machines`, `telemetry`, `incidents`, `documents`), and automatically seeds the 24 industrial machinery records, telemetry history, incidents, and document metadata from `data/seed/`.
- Upon connecting to Azure Blob Storage, it automatically provisions the `documents` container and uploads all sample technical manuals.

If you ever wish to re-seed or verify your Azure database independently via CLI:
```bash
npm run seed:cosmos
```

### 3. Deploying Web Application to Azure App Service:
You can deploy using GitHub Actions, Azure CLI, or VS Code Azure Tools:
```bash
az webapp up \
  --name <your-app-service-name> \
  --resource-group rg-factoryguard-prod \
  --runtime "NODE:24-lts"
```

Configure the Application Settings on App Service with the environment variables from your `.env`.

---

## 9. Troubleshooting

- **Cosmos DB connection failure / timeout**: Verify that your client IP or Azure App Service outbound IP is allowed in the Cosmos DB Firewall settings, or check that `COSMOS_ENDPOINT` and `COSMOS_KEY` are correct.
- **Blob download returns 403**: Ensure your storage connection string contains an active account key to permit SAS generation, or verify container access policies in the Azure Portal.
- **Port 3000 in use**: Specify a different port: `PORT=3001 npm run dev`.

---

## License

FactoryGuard is developed for the Microsoft Azure Developer Community Club workshop. All sample machine data, serial identifiers, and documents are fictional.
