# FactoryGuard - Requirements and Feature Specification

## 1. Scope

This document defines the functional and non-functional requirements for the initial FactoryGuard implementation used as the Azure LaunchPad workshop project.

The system is an industry-style **industrial monitoring prototype** with simulated machine telemetry. It is not a real industrial-control system and must not be implemented as one.

Participants deploy a prebuilt repository. The product itself is built before the event by the project team.

---

## 2. Functional Requirements

### FR-01 - Plant Overview Dashboard

The system shall provide a primary dashboard showing the current state of the simulated plant.

Required information:
- Total machines.
- Machines in NORMAL state.
- Machines in WARNING state.
- Machines in CRITICAL state.
- Active incidents.
- Overall plant health summary.
- Recent incidents.
- Selected recent telemetry indicators.

Acceptance criteria:
- Dashboard loads without requiring the user to manually seed data.
- Counts are derived from current persisted state.
- Counts update after a successful simulation event.
- Refreshing the page does not lose persisted state.

---

### FR-02 - Machine Registry

The system shall maintain a registry of fictional machines.

Each machine should have at least:
- `id`
- `name`
- `machineType`
- `line`
- `location`
- `status`
- `healthScore`
- `lastTelemetryAt`
- `createdAt`
- `updatedAt`

Optional fields may include:
- Manufacturer.
- Model.
- Installation date.
- Operating hours.
- Maintenance due date.

Do not use real manufacturer serial numbers or real sensitive identifiers.

---

### FR-03 - Machine Detail View

A user shall be able to open an individual machine and inspect:
- Current status.
- Health score.
- Latest telemetry values.
- Recent telemetry history.
- Recent incidents.
- Associated documents.
- Last update time.

The machine detail page should visually prioritize the current operational state over raw data.

---

### FR-04 - Telemetry Model

The system shall represent simulated telemetry events containing at least:
- `id`
- `machineId`
- `timestamp`
- `temperatureC`
- `vibrationMmS`
- `pressurePsi`
- `operatingHours`
- `scenario`
- `source`

`source` should default to something such as `simulator` for the workshop.

Telemetry values must be deterministic for the main workshop scenarios.

---

### FR-05 - Anomaly Detection

The initial implementation shall use deterministic rules rather than a trained ML model.

Recommended baseline operating bands:

| Metric | Normal | Warning | Critical |
|---|---|---|---|
| Temperature | 45-70 C | >70 to 90 C | >90 C |
| Vibration | 0-6 mm/s | >6 to 10 mm/s | >10 mm/s |
| Pressure | 90-110 PSI | >110 to 118 PSI | >118 PSI |

The exact thresholds may be centralized in configuration, but they must not be scattered throughout the UI or API code.

Rules:
- NORMAL when the latest values are within all normal bands.
- WARNING when one or more warning thresholds are crossed and no critical threshold is crossed.
- CRITICAL when at least one critical threshold is crossed or a predefined severe combination is detected.

The implementation must make it possible to replace the rule engine later without rewriting the dashboard.

---

### FR-06 - Health Score

Each machine should expose a simple derived health score from 0-100.

The initial score does not need to be mathematically sophisticated. It should be deterministic and consistent with the machine state.

Example policy:
- Normal machine: generally 80-100.
- Warning machine: generally 50-79.
- Critical machine: generally 0-49.

The score is an operational visualization, not a validated engineering metric. UI copy should not claim that the score predicts actual mechanical failure probability.

---

### FR-07 - Incident Generation

A WARNING or CRITICAL simulation event shall create or update an incident record.

Incident fields:
- `id`
- `machineId`
- `severity`
- `type`
- `title`
- `description`
- `status`
- `detectedAt`
- `resolvedAt` (nullable)
- `triggerTelemetryId`
- `telemetrySnapshot`

Incident status should minimally support:
- `OPEN`
- `RESOLVED`

A repeat simulation for the same active machine condition should not generate uncontrolled duplicate incidents on every refresh.

---

### FR-08 - Simulation Controls

The dashboard shall provide a controlled way to trigger deterministic machine scenarios.

Required scenarios:
1. **Normal**
2. **Warning**
3. **Critical**
4. **Reset/Recovery**

The simulation control should allow the facilitator to choose a target machine or use a clearly identified demo machine.

After simulation:
- A telemetry event is generated.
- The machine status is recalculated.
- Relevant incident state is updated.
- The dashboard can observe the changed state.

---

### FR-09 - Telemetry Persistence

Telemetry events shall be stored in Azure Cosmos DB.

The design must support querying recent telemetry by machine and time window.

The system should avoid unbounded page loads. Use a default limit for history queries.

---

### FR-10 - Incident Persistence

Incidents shall be stored in Azure Cosmos DB and must survive application refreshes and restarts.

---

### FR-11 - Documents and Reports

FactoryGuard shall provide fictional supporting documents through Azure Blob Storage.

Examples:
- Machine operating manual.
- Preventive maintenance procedure.
- Inspection report.
- Troubleshooting guide.

Document metadata should be stored separately from binary content.

The initial build should avoid public anonymous write access to Blob Storage.

---

### FR-12 - Application Monitoring

The application shall emit telemetry suitable for Application Insights / Azure Monitor.

At minimum, instrument:
- HTTP requests.
- Errors/exceptions.
- Important simulation operations.
- Function execution where supported.

The workshop must be able to demonstrate at least one visible monitoring signal after a participant performs an action.

---

### FR-13 - Health Endpoint

The application shall expose a health endpoint that verifies basic application readiness.

The endpoint should return:
- Application status.
- Build/version identifier.
- Timestamp.
- Dependency status where practical.

Do not make the endpoint perform expensive queries.

---

### FR-14 - Seed Data

The repository shall include a repeatable seed mechanism.

The seed dataset should contain enough fictional machines and telemetry to make the dashboard visually credible.

Target scale for the workshop build:
- Approximately 20-30 machines.
- Several production lines/areas.
- Recent telemetry per machine.
- A small number of historical incidents.
- A small set of documents.

Seed operations must be safe to run intentionally and should not create uncontrolled duplicates.

---

## 3. UX Requirements

### UX-01 - Operations-first dashboard

The first screen should answer:

> “What is happening in the plant right now?”

Do not lead with database tables.

### UX-02 - Strong state visualization

NORMAL, WARNING, and CRITICAL must be visually distinct while remaining accessible to users who do not rely solely on color.

Use text labels/icons alongside color.

### UX-03 - Fast scenario feedback

After a simulation is submitted, the user should receive clear progress/success/failure feedback.

### UX-04 - No demo dead ends

An instructor must be able to recover the demo machine back to normal using the reset/recovery control.

### UX-05 - Responsive layout

The dashboard should work on a laptop browser at typical classroom resolutions. Mobile support is useful but is not the primary workshop target.

---

## 4. Participant Use Cases

### UC-01 - First deployment

A student clones the repository, deploys it to Azure App Service, opens the generated URL, and sees the seeded FactoryGuard dashboard.

### UC-02 - Verify Azure application

A student opens Azure Portal, locates the FactoryGuard resource group, and identifies App Service and other resources.

### UC-03 - Trigger warning condition

A student triggers a warning scenario and observes the machine state change and incident indicator.

### UC-04 - Trigger critical condition

A student triggers a critical scenario and observes a CRITICAL machine state and high-severity incident.

### UC-05 - Inspect persistence

A student refreshes the dashboard and sees that the changed state remains, demonstrating cloud persistence.

### UC-06 - Inspect monitoring

A student opens Application Insights / monitoring and identifies telemetry associated with their recent request or event.

### UC-07 - Explain service responsibilities

A student can map:
- Dashboard -> App Service.
- Event processing -> Functions.
- Persistent application data -> Cosmos DB.
- Documents/assets -> Blob Storage.
- Monitoring -> Application Insights.

---

## 5. Non-Functional Requirements

### NFR-01 - Reliability

The core demo path must be stable under repeated execution.

### NFR-02 - Determinism

The workshop scenarios must produce predictable outputs.

### NFR-03 - Maintainability

Thresholds, Azure configuration, data models, and service clients must be separated cleanly.

### NFR-04 - Security baseline

- No secrets in source control.
- No API keys in client-side JavaScript.
- No password storage.
- No real personal or production data.
- No destructive administrative actions exposed to normal UI users.

### NFR-05 - Cost awareness

The project must be designed so that the workshop does not require a large paid Azure footprint. Avoid unnecessary enterprise-tier dependencies.

### NFR-06 - Observability

The project must provide enough telemetry to troubleshoot deployment and application behavior.

### NFR-07 - Clean environment setup

A new contributor should be able to understand required environment variables from `.env.example` and project documentation.

---

## 6. Constraints

### Event constraints

- Hard maximum: 120 minutes.
- FactoryGuard deployment/testing: approximately 45 minutes.
- Participants are beginners or have limited Azure exposure.
- Approximately 100 participants may be attempting the workflow concurrently.

### Technical constraints

- Application is prebuilt.
- GitHub is the source repository.
- Azure App Service is the main web hosting target.
- Azure Functions are part of the architecture.
- Cosmos DB is the persistence layer.
- Blob Storage is the document/asset store.
- Application Insights is used for monitoring.
- Infrastructure provisioning must be repeatable, but **Bicep is explicitly deferred** to a later prompt.

### Operational constraints

- Maintain an instructor-controlled live instance.
- Freeze the demo repository before the event.
- Test deployment with multiple student accounts before event day.
- Keep a fallback deployment/demo if student Azure access fails.

---

## 7. Out of Scope for Initial Implementation

- Real IoT hardware.
- Real-time WebSocket/SSE streaming if it complicates deployment.
- Machine-learning inference service.
- Advanced forecasting.
- User registration/login system.
- Enterprise identity integration.
- Role-based administration.
- Multi-tenancy.
- Billing analytics.
- Complex workflow orchestration.
- Bicep templates.
- Kubernetes.
- Azure API Management.
- Service Bus/Event Hubs unless later requested as an architecture evolution.

---

## 8. Suggested Feature Priorities

### P0 - Must work for the event

- Dashboard.
- Machine list/details.
- Seed data.
- Telemetry persistence.
- Warning/critical anomaly rules.
- Incident generation.
- Simulation controls.
- App Service hosting.
- Functions processing.
- Cosmos DB persistence.
- Application Insights telemetry.
- Stable clone/run/deploy experience.

### P1 - Strongly recommended

- Blob-backed documents.
- Recent telemetry chart.
- Health endpoint.
- Recovery scenario.
- Basic filtering/search.
- Clean empty/error/loading states.

### P2 - Later extension

- Real-time stream.
- ML anomaly detection.
- Forecasting.
- Predictive maintenance scoring.
- Entra ID / RBAC.
- IoT.
- CI/CD hardening.
- Advanced analytics.

---

## 9. Acceptance Test: The 10-Minute Demo

A clean deployment should support this exact test:

1. Open FactoryGuard dashboard.
2. Confirm machines and plant summary are populated.
3. Select demo machine.
4. Trigger WARNING.
5. Observe machine state change.
6. Observe incident creation.
7. Refresh page.
8. Confirm state persists.
9. Trigger CRITICAL.
10. Open monitoring and find evidence of the application/event activity.

If this sequence fails, the implementation is not ready for the event.
