# FactoryGuard - Architecture Specification

## 1. Architectural Intent

FactoryGuard is a small but credible cloud application demonstrating how a web frontend, serverless event processing, managed NoSQL persistence, object storage, and application monitoring fit together.

The architecture is intentionally simple enough for a beginner workshop while preserving clear separation of responsibilities.

---

## 2. Baseline Technology Stack

### Frontend / web application

- **Next.js** using the App Router.
- **TypeScript**.
- **Tailwind CSS** for styling.
- Charting library may be used for telemetry visualization if lightweight and stable; avoid introducing a large visualization framework for a single dashboard.

### Hosting

- **Azure App Service** for the web application.

### Backend / event processing

- **Azure Functions** using TypeScript/Node.js.
- HTTP-triggered functions for workshop operations and application backend actions.

### Database

- **Azure Cosmos DB for NoSQL**.
- Use the official Azure Cosmos DB JavaScript/TypeScript SDK.

### Object storage

- **Azure Blob Storage** using the official Azure Storage Blob SDK.
- Store fictional machine documentation, inspection reports, and similar assets.

### Monitoring

- **Application Insights / Azure Monitor**.
- Instrument the Next.js server-side/application path and Azure Functions where practical.

### Source control

- **GitHub**.

### Local development

- Node.js runtime pinned in project metadata.
- Package manager should be chosen once and used consistently throughout the repository. Prefer `pnpm` or `npm`; do not mix package managers.

### Infrastructure as code

**Deferred. Do not generate Bicep files in the initial implementation.**

The codebase should nevertheless be designed so resource names, connection information, regions, and other infrastructure values are supplied through configuration rather than hard-coded.

---

## 3. Logical Architecture

```text
                         +----------------------+
                         |      User Browser    |
                         +----------+-----------+
                                    |
                                    | HTTPS
                                    v
                         +----------------------+
                         |   Azure App Service  |
                         |   Next.js Web App    |
                         |                      |
                         | Dashboard / UI       |
                         | Server API / Proxy   |
                         +----------+-----------+
                                    |
                              authenticated /
                              controlled API
                                    |
                                    v
                         +----------------------+
                         |    Azure Functions   |
                         | Event / API Logic    |
                         +-----+-----------+----+
                               |           |
                     +---------+           +----------+
                     |                                |
                     v                                v
             +---------------+                +---------------+
             | Cosmos DB      |                | Blob Storage  |
             | NoSQL          |                | Documents    |
             |                |                | / Reports    |
             | machines       |                | / Assets     |
             | telemetry      |                +---------------+
             | incidents      |
             | documents meta |
             +---------------+

                         Application Insights
                                  ^
                                  |
                          telemetry from
                         App Service/Functions
```

---

## 4. Why App Service + Functions

### App Service

App Service is responsible for the user-facing web application. This gives participants an immediately understandable cloud-hosting model:

```text
GitHub repository -> Azure App Service -> public HTTPS application
```

The dashboard must not depend on a developer machine being online.

### Functions

Functions represent the backend event-processing capability. They are appropriate for small HTTP-driven operations and simulated event processing without maintaining a dedicated server process for the workshop.

The Functions layer should own:
- Telemetry ingestion.
- Scenario processing.
- Anomaly evaluation.
- Incident state transitions.
- Data persistence operations that conceptually belong to backend/event logic.

Do not put all domain logic directly in Next.js client components.

---

## 5. Service Responsibility Map

| Component | Primary responsibility | Must not become |
|---|---|---|
| Next.js App Service | UI, server-rendered pages, server-side API/proxy layer, presentation logic | Database engine or industrial rules engine |
| Azure Functions | Domain/event processing and integration logic | Full frontend framework |
| Cosmos DB | Durable application state | Business-logic layer |
| Blob Storage | Binary documents/assets | Transactional database |
| Application Insights | Telemetry and diagnostics | Application state store |

---

## 6. Data Model

### 6.1 Machine

Suggested shape:

```ts
interface Machine {
  id: string;
  name: string;
  machineType: string;
  line: string;
  location: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  healthScore: number;
  lastTelemetryAt: string;
  operatingHours?: number;
  maintenanceDueAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 TelemetryEvent

```ts
interface TelemetryEvent {
  id: string;
  machineId: string;
  timestamp: string;
  temperatureC: number;
  vibrationMmS: number;
  pressurePsi: number;
  operatingHours: number;
  scenario: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'RECOVERY';
  source: 'simulator';
}
```

### 6.3 Incident

```ts
interface Incident {
  id: string;
  machineId: string;
  severity: 'WARNING' | 'CRITICAL';
  type: 'TEMPERATURE' | 'VIBRATION' | 'PRESSURE' | 'MULTI_SIGNAL';
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  detectedAt: string;
  resolvedAt?: string | null;
  triggerTelemetryId: string;
  telemetrySnapshot: {
    temperatureC: number;
    vibrationMmS: number;
    pressurePsi: number;
  };
}
```

### 6.4 DocumentMetadata

```ts
interface DocumentMetadata {
  id: string;
  machineId?: string;
  name: string;
  category: 'MANUAL' | 'MAINTENANCE' | 'INSPECTION' | 'REPORT';
  blobName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}
```

---

## 7. Cosmos DB Container Strategy

Initial recommended database:

```text
Database: factoryguard
```

Recommended containers:

```text
machines
telemetry
incidents
documents
```

Suggested partition keys:

- `machines`: `/id`
- `telemetry`: `/machineId`
- `incidents`: `/machineId`
- `documents`: `/machineId` with a defined fallback such as `/global` for plant-wide documents, or use a normalized partition field such as `partitionKey`.

The exact container naming can be centralized in a configuration module.

The dashboard is a small synthetic dataset, so a cross-machine summary query is acceptable for the workshop. Do not optimize for hyperscale before there is a real requirement.

---

## 8. Telemetry and Anomaly Flow

For a simulated event:

```text
POST simulation request
        |
        v
Azure Function
        |
        +--> create telemetry event
        |
        +--> evaluate thresholds
        |
        +--> calculate machine state
        |
        +--> create/update incident
        |
        +--> persist state to Cosmos DB
        |
        +--> emit application telemetry
        |
        v
return updated state
        |
        v
Next.js dashboard refresh/revalidate
```

The system should return enough data to let the UI update immediately without forcing an unnecessary full page reload, but a simple refetch after mutation is acceptable.

---

## 9. Blob Storage Flow

Machine-related documents are binary assets.

Recommended pattern:

```text
Dashboard -> Next.js route/function -> document metadata lookup
                                      |
                                      v
                                 Blob Storage
                                      |
                                      v
                             short-lived access URL
```

Do not expose storage account keys to the browser.

For the initial workshop, a lightweight document-download implementation is sufficient. Do not build a complete document-management system.

---

## 10. Monitoring Architecture

Application Insights should capture:

### Web application
- HTTP requests.
- Server-side exceptions.
- Route failures.
- Important simulation operations.

### Functions
- Invocation count.
- Execution duration.
- Exceptions.
- Important event-processing traces.

Use structured logs where practical. Include:
- `machineId`.
- `scenario`.
- `incidentId` where relevant.
- Correlation/request identifiers when available.

Do not log secrets or sensitive environment variables.

---

## 11. Authentication and Authorization

### Initial workshop implementation

There is intentionally **no full end-user authentication system** in the first version.

Reasons:
- The workshop has only 45 minutes of practical time.
- Approximately 100 participants may deploy concurrently.
- Authentication setup would consume time without teaching the core cloud architecture.
- FactoryGuard is a simulated training system, not a production application handling real customer data.

However, mutation/simulation operations should not expose secrets in client-side code.

Preferred design:
- Browser calls App Service's server-side route.
- App Service server-side code calls the Function API.
- Any internal function secret is stored in Azure configuration, not source control and not browser JavaScript.

If a first implementation needs to simplify this further, document the limitation explicitly rather than pretending the API is production-secure.

### Future production direction

A later version can add:
- Microsoft Entra ID.
- Role-based access control.
- Separate operator/maintenance/admin roles.
- Protected API endpoints.

Do not implement the full identity stack now unless explicitly requested.

---

## 12. Repository Structure

Recommended monorepo layout:

```text
factoryguard/
|
+-- app/                         # Next.js App Router
|   +-- (dashboard)/
|   |   +-- dashboard/
|   |   +-- machines/
|   |   +-- incidents/
|   |   +-- documents/
|   |   +-- ...
|   +-- api/                     # Next.js server-side proxy/API routes
|   +-- layout.tsx
|   +-- page.tsx
|
+-- components/                  # Shared UI components
+-- lib/
|   +-- config/
|   +-- domain/
|   +-- validation/
|   +-- api-client/
|   +-- observability/
|   +-- blob/
|   +-- cosmos/
|
+-- functions/                   # Azure Functions
|   +-- src/
|       +-- functions/
|       +-- domain/
|       +-- services/
|       +-- data/
|       +-- shared/
|
+-- scripts/
|   +-- seed/
|   +-- local-development/
|
+-- public/
|   +-- static-assets/
|
+-- tests/
|   +-- unit/
|   +-- integration/
|
+-- .env.example
+-- README.md
+-- package.json
+-- tsconfig.json
+-- ...
```

The exact file layout may change, but the separation between UI, shared domain/configuration, Functions, and tooling should remain.

---

## 13. Domain Logic Placement

The anomaly rules are domain logic and should be isolated from:
- React components.
- Azure SDK calls.
- HTTP transport code.
- Database repository implementations.

Recommended conceptual layers:

```text
Transport
   |
   v
Application service
   |
   v
Domain rules / anomaly engine
   |
   v
Repository interfaces
   |
   v
Azure SDK implementations
```

This makes later replacement of rule-based anomaly detection with ML inference possible without rewriting the entire system.

---

## 14. Configuration

Use environment variables or centralized configuration objects for:

```text
APP_ENV
APP_VERSION
COSMOS_ENDPOINT
COSMOS_KEY / managed identity configuration later
COSMOS_DATABASE
COSMOS_MACHINES_CONTAINER
COSMOS_TELEMETRY_CONTAINER
COSMOS_INCIDENTS_CONTAINER
COSMOS_DOCUMENTS_CONTAINER
STORAGE_ACCOUNT_URL / STORAGE_CONNECTION_STRING
STORAGE_CONTAINER_NAME
FUNCTION_BASE_URL
FUNCTION_INTERNAL_SECRET or equivalent internal-auth configuration
APPLICATIONINSIGHTS_CONNECTION_STRING
SIMULATION_DEFAULT_MACHINE_ID
```

Never hard-code production resource names or credentials into application source.

The final names used by event-day infrastructure will be supplied separately.

---

## 15. Deployment Model

The workshop target is:

```text
GitHub repository
      |
      v
Azure App Service deployment
      |
      +----> Next.js application
      |
      +----> configuration points to Azure services

Azure Functions
      |
      +----> event processing

Cosmos DB
      |
      +----> persistent state

Blob Storage
      |
      +----> documents/assets

Application Insights
      |
      +----> monitoring
```

The exact Azure resource provisioning workflow will be finalized before the event.

**Do not create Bicep files as part of this initial application build.**

---

## 16. Performance Expectations

Workshop scale is small in application-data terms. Optimize for:
- Low latency for dashboard actions.
- Simple queries.
- Predictable behavior.
- Clear errors.
- No unnecessary background workers.

The deployment may involve many participant applications, but each individual FactoryGuard instance only contains a small synthetic dataset.

Avoid premature distributed caching, message brokers, Kubernetes, or complex CQRS.

---

## 17. Failure Handling

The UI must distinguish:
- Loading.
- Successful operation.
- Validation failure.
- Backend failure.
- Azure dependency failure.

Errors returned to the user should be understandable. Developer logs should retain more technical detail.

The system must not silently convert a failed simulation into a fake success.

---

## 18. Testing Strategy

### Unit tests

At minimum test:
- Threshold evaluation.
- Status derivation.
- Health-score derivation.
- Incident creation/merge behavior.
- Scenario payload validation.

### Integration tests

Test:
- Function -> Cosmos DB persistence.
- Document metadata -> Blob Storage path.
- Health endpoint.

### Smoke test

The project must support the 10-step event-day demo defined in `REQUIREMENTS.md`.

---

## 19. Architectural Guardrails for the Coding Agent

1. Keep the application cloud-ready but locally runnable.
2. Prefer TypeScript end-to-end.
3. Keep Azure SDK calls behind service/repository modules.
4. Keep business rules independent from Azure APIs.
5. Never put secrets in browser code.
6. Avoid adding Azure services not justified by a concrete requirement.
7. Do not generate Bicep yet.
8. Do not implement physical IoT integrations.
9. Do not claim the rule engine is machine learning.
10. Do not replace Cosmos DB with an in-memory database in the cloud build.
11. Do not replace App Service with Vercel or another platform; Azure App Service is a deliberate workshop requirement.
12. Keep the main demo flow deterministic and recoverable.
