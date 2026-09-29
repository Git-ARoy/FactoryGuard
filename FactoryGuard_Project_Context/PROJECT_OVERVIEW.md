# FactoryGuard - Project Overview

## 1. Project Identity

**Project name:** FactoryGuard

**Expanded name:** Intelligent Industrial Monitoring & Predictive Maintenance Platform

**Primary purpose:** FactoryGuard is an industry-shaped cloud application that simulates an industrial plant and gives an operations team a single dashboard for machine health, telemetry, abnormal-condition detection, incidents, supporting documents, and application monitoring.

**Primary Azure objective:** Demonstrate how several managed Azure services form one coherent application rather than teaching Azure services in isolation.

**Workshop context:** FactoryGuard is the prebuilt project used in **Azure LaunchPad 2026**, the first event of the Microsoft Azure Developer Community Club at Alliance University. The event has a hard maximum duration of two hours, with approximately 45 minutes reserved for the hands-on deployment. Participants are expected to clone the prepared GitHub repository and deploy/run the application. They are **not** expected to implement the product from scratch during the event.

The approved event proposal requires an introduction to five beginner-friendly Azure services, a real-world project demonstration, and hands-on deployment, testing, and basic troubleshooting. FactoryGuard is the concrete product used to satisfy that practical portion of the event. fileciteturn2file0

---

## 2. Problem Being Solved

Industrial organizations operate machinery whose condition can change continuously. Temperature, vibration, pressure, operating hours, and similar signals can indicate that a machine is operating normally, entering a warning state, or approaching a critical state.

A basic operational problem is therefore:

> How can an operations team collect machine signals, process abnormal conditions, persist the resulting state, expose it through an operational dashboard, and monitor the software responsible for doing all of this?

FactoryGuard provides a software-only answer for a training/demo environment.

The project deliberately uses **simulated machine telemetry** instead of physical industrial hardware. The simulation makes the system deterministic, portable, inexpensive, and suitable for a room of approximately 100 students while still demonstrating the architecture patterns used in telemetry-driven systems.

The workshop version should not claim that it is a production-grade predictive-maintenance platform or a safety system. Its anomaly detection is deterministic and rule-based unless a later project phase explicitly adds a trained ML model. The product name uses “predictive maintenance” as the product direction; the current workshop implementation is an **industrial monitoring and anomaly-detection prototype**.

---

## 3. Target Users

### 3.1 Primary application users

**Plant operations / control-room operator**
- Wants a high-level view of plant health.
- Needs to identify machines in normal, warning, and critical states quickly.
- Needs to inspect the latest telemetry for a machine.
- Needs to see active and historical incidents.
- Needs access to machine-related documents or maintenance reports.

**Maintenance engineer**
- Needs machine-specific telemetry and incident context.
- Needs to understand what condition caused an alert.
- Needs access to supporting documents.
- Needs enough historical context to decide whether a machine requires inspection.

**Workshop participant**
- Is primarily a developer/student learning cloud deployment.
- Needs a working application with believable data and clear visual feedback.
- Needs to trigger deterministic scenarios and observe the resulting cloud workflow.

### 3.2 Secondary users

**Club instructor / facilitator**
- Needs a stable demo instance.
- Needs scenario controls for normal/warning/critical events.
- Needs clear application and cloud-health signals for live teaching.

**Future club contributors**
- May extend the system with IoT ingestion, AI/ML anomaly detection, CI/CD, analytics, security, or event-driven processing.

---

## 4. Product Narrative

FactoryGuard should tell one continuous story:

```text
Industrial machine
      |
      v
Simulated telemetry
      |
      v
Event / anomaly processing
      |
      +------------------+
      |                  |
      v                  v
Persistent state      Incident state
      |                  |
      +--------+---------+
               |
               v
      FactoryGuard dashboard
               |
               v
      Operational visibility
               |
               v
      Application monitoring
```

The user should be able to see a machine move from **NORMAL -> WARNING -> CRITICAL** and understand that this is the result of data moving through a cloud system.

---

## 5. Product Experience

The application should include a polished operations-dashboard experience rather than a generic CRUD interface.

### Plant overview

Display at least:
- Total machine count.
- Healthy/normal machines.
- Warning machines.
- Critical machines.
- Active incidents.
- Overall plant health indicator.
- Recent alerts/incidents.
- Recent telemetry trends or compact sparkline/chart data.

### Machine monitoring

Each machine should expose:
- Machine identity.
- Machine type/category.
- Production line or area.
- Current operational status.
- Health score.
- Latest temperature.
- Latest vibration.
- Latest pressure.
- Last telemetry timestamp.
- Current incident/alert state, if any.

### Incident view

Show:
- Incident title.
- Machine.
- Severity.
- Trigger condition.
- Detected timestamp.
- Current state.
- Relevant telemetry snapshot.

### Documents

Provide sample machine manuals, maintenance procedures, or inspection reports stored in Azure Blob Storage. Documents should be fictional and must not contain real personal or confidential data.

### Simulation controls

Provide deterministic controls for:
- Normal condition.
- Warning condition.
- Critical condition.
- Reset/recover condition.

The controls are a workshop feature. They exist so the entire data flow can be demonstrated without physical equipment.

### Monitoring

The product should emit application telemetry that can be inspected with Azure Application Insights / Azure Monitor. The workshop only requires basic visibility, such as application requests, failures, or a test event.

---

## 6. Azure Services Demonstrated

FactoryGuard is designed around five services required by the event plan:

| Azure service | FactoryGuard responsibility |
|---|---|
| Azure App Service | Hosts the web dashboard/application. |
| Azure Functions | Runs backend/event-processing logic. |
| Azure Cosmos DB | Stores machines, telemetry, incidents, and document metadata. |
| Azure Blob Storage | Stores machine documents, reports, and application assets where applicable. |
| Application Insights | Provides application telemetry, diagnostics, and basic monitoring. |

The services should have meaningful responsibilities. Do not add a service merely to increase the Azure service count.

---

## 7. Background and Motivation

The first Azure Developer Community Club event needs to establish the club's technical identity. A generic “deploy a website” exercise would not adequately demonstrate why cloud architecture matters. FactoryGuard was selected because it offers:

1. An understandable industrial problem.
2. A visually strong dashboard.
3. A clear reason for each Azure service.
4. A deterministic demonstration that works without external hardware.
5. A repository that can be completely prepared before the event.
6. An architecture that can later be expanded into advanced club workshops.

The approved proposal also expects students to leave with basic Azure experience, an understanding of their first Azure project, and a roadmap for certifications, projects, hackathons, workshops, and community activity.

---

## 8. High-Level Goals

### Goal 1 - Deliver a believable industry-style cloud application

The UI, data model, APIs, and Azure integration should look like a serious engineering prototype rather than a classroom CRUD demo.

### Goal 2 - Make Azure architecture visible

A participant should be able to answer:
- What runs on App Service?
- What runs on Functions?
- What is stored in Cosmos DB?
- What belongs in Blob Storage?
- What does Application Insights tell us?

### Goal 3 - Make the workshop reliable

The full product must be prebuilt and seeded so that the participant task is primarily:

```text
Clone -> Configure -> Deploy -> Open -> Simulate -> Observe
```

### Goal 4 - Provide strong visual feedback

A single simulation action should produce a visible state transition. The application should make the cloud workflow understandable within seconds.

### Goal 5 - Keep the project extensible

Future iterations may add:
- Azure IoT telemetry.
- Event Hubs / streaming ingestion.
- Real-time updates.
- ML-based anomaly detection.
- Forecasting.
- Power BI or advanced analytics.
- CI/CD.
- Containers.
- Entra ID authentication.
- Role-based access control.
- More robust observability.

These are extension paths, not requirements for the first workshop build.

---

## 9. Explicit Non-Goals

Do **not** implement the following in the initial FactoryGuard workshop version unless separately requested:

- Physical IoT sensor integration.
- Industrial PLC/SCADA integration.
- Real factory connectivity.
- Safety-critical automation or machine control.
- Payment/billing workflows.
- Multi-tenant SaaS architecture.
- Complex user administration.
- Full enterprise SSO.
- A trained predictive-maintenance ML model.
- Advanced statistical forecasting.
- Kubernetes/AKS.
- Event Hubs or Service Bus solely for architectural decoration.
- Azure API Management solely because it is an Azure product.
- Bicep infrastructure files in the initial build.

The last point is explicit: **do not create Azure Bicep files yet.** Infrastructure-as-code will be requested separately after the application implementation is stable.

---

## 10. Workshop Constraints

- Maximum event duration: **2 hours**.
- Hands-on time: approximately **45 minutes**.
- Expected audience: students with beginner-level or limited Azure exposure.
- Expected event scale: approximately **100 participants**.
- Application is a prebuilt GitHub project.
- Participants are not expected to write the core application during the event.
- Workshop should avoid paid/nonessential Azure services and stay compatible with student-account constraints.
- Demo data must be fictional and safe to publish.
- The application must be testable without physical infrastructure.
- The initial build must prioritize deployment reliability over feature count.

---

## 11. Definition of Done for the Initial Product

The initial FactoryGuard application is complete when:

1. The dashboard loads successfully in a local development environment.
2. Seed data creates a believable set of industrial machines.
3. Machines have deterministic health states and telemetry.
4. Normal, warning, and critical simulation scenarios work reliably.
5. Incidents are generated and persisted when abnormal scenarios occur.
6. Data is persisted in Cosmos DB rather than only in browser state.
7. Documents/assets can be represented through Blob Storage integration.
8. The web application can be hosted on Azure App Service.
9. Azure Functions perform backend/event-processing responsibilities.
10. Application Insights instrumentation is present and produces useful telemetry.
11. Environment configuration is explicit and documented.
12. No secrets are committed to Git.
13. The repository can be cloned and started from a clean machine using documented steps.
14. The project contains no initial Bicep implementation unless separately requested.

---

## 12. Agent Operating Principle

Build the smallest system that looks and behaves like a credible industrial monitoring product. Do not add framework complexity merely because it is possible. Prefer deterministic, testable behavior over sophisticated but fragile algorithms.

When a feature decision is unclear, prioritize this hierarchy:

```text
Workshop reliability
    >
Clear cloud architecture
    >
Core product experience
    >
Extensibility
    >
Optional sophistication
```
