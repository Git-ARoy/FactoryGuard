# FactoryGuard - Technical Decisions and Rejected Alternatives

## 1. Purpose of This Document

This file prevents the coding agent from repeatedly proposing architectural alternatives that the project has already considered and rejected.

The initial FactoryGuard implementation is constrained by the Azure LaunchPad workshop format: approximately 100 participants, a two-hour event, roughly 45 minutes of hands-on time, and a prebuilt GitHub application that participants deploy rather than build from scratch.

When proposing a change, the agent must first check whether the decision below already answers the question.

---

## 2. Core Product Decision: Industry-Shaped Application

### Decision
Build FactoryGuard as an industrial monitoring / anomaly-detection platform.

### Rejected alternatives

**Generic student event portal**
- Too close to a CRUD demonstration.
- Does not naturally justify five different Azure services.
- Weak connection to real engineering systems.

**Simple e-commerce demo**
- Common tutorial pattern.
- Adds business/domain noise without improving the Azure lesson.

**Generic social media application**
- Too broad for the event timeframe.
- Not a good fit for telemetry, cloud monitoring, or serverless event processing.

**Simple “Hello World” deployment**
- Demonstrates hosting only.
- Does not provide enough architectural depth for the intended club positioning.

---

## 3. Decision: Simulated Industrial Telemetry

### Decision
Use simulated telemetry rather than physical IoT hardware.

### Why
- No hardware distribution problem.
- No sensor calibration.
- No classroom networking dependency.
- Deterministic demo behavior.
- Every participant can reproduce the same scenario.
- Easier cleanup.

### Rejected

**Arduino/ESP32 sensors**
- Adds hardware logistics and failure points.
- Not appropriate for a 45-minute deployment lab with approximately 100 participants.

**Real factory data**
- Privacy, licensing, operational, and security complications.
- Not needed to teach the intended cloud architecture.

### Future direction
A later club session can replace the simulator with Azure IoT telemetry while keeping the domain model and anomaly engine largely intact.

---

## 4. Decision: Azure App Service for Web Hosting

### Decision
The web dashboard is hosted on Azure App Service.

### Why
- Explicitly matches the event's Azure fundamentals goal.
- Simple mental model: GitHub -> App Service -> public application.
- Suitable for a prebuilt web application.
- Participants can visually inspect deployment status and application URL in Azure Portal.

### Rejected

**Vercel**
- Convenient for Next.js, but would bypass the intended Azure hosting lesson.

**Netlify**
- Same issue as Vercel.

**Azure Static Web Apps**
- Technically viable for a frontend-heavy project, but the chosen application also has meaningful server-side integration and a separate Functions layer. App Service gives the workshop a stronger general-purpose managed application-hosting concept.

**AKS / Kubernetes**
- Excessive operational complexity for the workshop.
- Would shift learning toward container orchestration instead of Azure fundamentals.

---

## 5. Decision: Azure Functions for Backend/Event Processing

### Decision
Use Azure Functions for telemetry processing, anomaly evaluation orchestration, incident generation, and backend integrations.

### Why
- Directly demonstrates serverless computing.
- Fits event-like operations.
- Avoids maintaining another always-on server.
- Creates a clear conceptual boundary between the web application and processing logic.

### Rejected

**A second long-running Node/FastAPI server**
- Adds operational overhead.
- Weakens the serverless teaching point.

**Putting all backend logic into Next.js**
- Easier technically, but it would make the Azure Functions requirement artificial and would remove a key cloud-computing concept from the project.

**Azure Container Apps**
- Valid for a later architecture, but not necessary for the first workshop build.

---

## 6. Decision: TypeScript Across Application and Functions

### Decision
Prefer TypeScript end-to-end for the web application and Azure Functions.

### Why
- One primary language for contributors.
- Shared types can be reused.
- Lower cognitive overhead than maintaining a TypeScript frontend plus a Python backend for a short workshop project.

### Rejected

**Next.js + FastAPI**
- Technically strong and familiar in many projects, but it creates two primary language/runtime ecosystems for a beginner Azure deployment.
- The workshop does not require Python-specific backend functionality.

**Java/Spring Boot**
- Powerful for enterprise development but unnecessary complexity for the event.

---

## 7. Decision: Cosmos DB for Persistence

### Decision
Use Azure Cosmos DB for NoSQL.

### Why
- Managed Azure-native NoSQL database.
- Flexible document-shaped data matches machines, telemetry, incidents, and document metadata.
- Natural fit for JSON-oriented APIs.
- Demonstrates a real managed cloud database rather than an embedded local database.

### Rejected

**SQLite**
- Local-only/simple demonstration.
- Does not demonstrate cloud persistence.

**PostgreSQL**
- Excellent relational option, but adds schema/migration/relational modeling overhead that does not materially improve the workshop use case.

**MongoDB Atlas**
- Viable technically but would move the primary database demonstration away from Azure-managed infrastructure.

**In-memory storage**
- Would cause state loss on restart and undermine the persistence lesson.

---

## 8. Decision: Blob Storage for Documents

### Decision
Use Azure Blob Storage for fictional manuals, maintenance procedures, reports, and similar binary assets.

### Why
- Clear object-storage use case.
- Distinct responsibility from Cosmos DB.
- Lets the five-service architecture feel intentional rather than contrived.

### Rejected

**Store documents directly in Cosmos DB documents**
- Poor separation for binary content.
- Demonstrates the wrong storage abstraction.

**Bundle every document in the application image**
- Would technically work but would weaken the cloud object-storage demonstration.

**External cloud storage provider**
- Unnecessary for the event.

---

## 9. Decision: Application Insights for Monitoring

### Decision
Use Application Insights / Azure Monitor.

### Why
- Students need to see that deployment is not the final stage.
- Gives an Azure-native observability concept.
- Supports troubleshooting and live demonstration of telemetry.

### Rejected

**Console logs only**
- Not accessible as a meaningful cloud monitoring experience for the participant.

**Third-party observability platform**
- Adds setup and account dependencies without improving the Azure lesson.

---

## 10. Decision: Rule-Based Anomaly Detection First

### Decision
Use deterministic threshold/rule logic for the workshop version.

### Why
- Predictable.
- Easy to explain.
- Easy to test.
- Fast to execute.
- Does not need model deployment, training data, or GPU resources.
- Allows the workshop to demonstrate cloud architecture rather than spending its time on ML pipeline mechanics.

### Rejected

**Actual trained predictive-maintenance model**
- Training/data quality issues.
- More services and deployment complexity.
- Harder to make every student's result deterministic.
- Not necessary for the initial event.

### Important wording rule

Do not tell users that the initial rule engine is machine learning or that the current health score is a validated probability of failure.

A later version may add ML as a separate inference layer.

---

## 11. Decision: REST/JSON API

### Decision
Use REST-style JSON APIs.

### Why
- Easy to inspect in browser/network tools.
- Familiar to students.
- Straightforward across Next.js and Functions.
- Simple to troubleshoot live.

### Rejected

**GraphQL**
- Adds schema/query complexity with little workshop value.

**gRPC**
- More tooling and deployment complexity for the browser-oriented demo.

**Event-only messaging API**
- Would make the interactive workshop harder because students need immediate request/response feedback.

---

## 12. Decision: No Full End-User Authentication in Initial Build

### Decision
The workshop application is accessible without a user account.

### Why
- There is insufficient time to onboard approximately 100 users into a custom application identity system.
- Authentication is not the core learning objective.
- The app contains only fictional data.

### Security baseline still required

- No secrets in client code.
- No secrets in GitHub.
- Internal service secrets stay server-side.
- Storage write operations are not exposed as anonymous browser operations.

### Rejected

**Microsoft Entra ID from day one**
- Valuable for a production extension, but introduces configuration, tenant/user consent, callback URLs, and troubleshooting that are not central to this workshop.

**NextAuth/Auth.js as an extra dependency**
- Same issue: useful infrastructure, wrong priority for the event.

---

## 13. Decision: Prebuilt GitHub Repository

### Decision
The complete application is built before the event and published to GitHub. Participants clone it and deploy it.

### Why
The event has a hard 120-minute cap and only about 45 minutes for hands-on work. Beginners should not spend the lab writing boilerplate code.

The participant experience is intentionally:

```text
Clone
  -> Configure
  -> Deploy
  -> Open
  -> Simulate
  -> Observe
```

### Rejected

**Live coding the full product**
- Not possible within the event timeframe.

**Participant creates application from an empty repository**
- Too many failure points.

**Deploying a generic starter template**
- Does not provide the intended industry context.

---

## 14. Decision: Browser-Controlled Simulation

### Decision
Provide simulation controls in the application UI.

### Why
- Facilitator can trigger the same scenario every time.
- Students can reproduce the result themselves.
- No hardware or external test tool is required.

### Rejected

**Postman-only demonstration**
- Useful for developers but visually weaker for a broad student audience.
- Splits the workflow across tools.

**Command-line-only simulation**
- Too intimidating for beginners and slower to synchronize across a large classroom.

---

## 15. Decision: Keep the Core Workflow Deterministic

### Decision
Normal, warning, critical, and recovery scenarios must have known outputs.

### Why
A workshop is not the right environment for probabilistic demos that may or may not generate an incident.

### Rejected

**Random telemetry only**
- Could fail to produce a warning/critical state during the instructor demonstration.

A randomized background simulation can be a future feature, but the event controls remain deterministic.

---

## 16. Decision: Bicep Deferred

### Decision
Do not create Bicep templates during the initial application build.

The user will request infrastructure-as-code separately after the software architecture and application are stable.

### Why
- Application implementation and infrastructure implementation should be validated separately.
- Early Bicep work may lock resource names/configuration before the final deployment path is known.
- The user explicitly requested that Bicep be generated later.

### Guardrail

The agent must not create:

```text
*.bicep
main.bicep
modules/*.bicep
infra/*.bicep
```

as part of the initial FactoryGuard application task unless specifically prompted.

It is acceptable to create non-Bicep deployment documentation or placeholder configuration interfaces.

---

## 17. Decision: Avoid Extra Azure Services Without a Concrete Role

The project intentionally demonstrates five Azure services. Do not add Event Hubs, Service Bus, API Management, Redis, Key Vault, Container Registry, AKS, Data Factory, Synapse, or another Azure service simply to make the architecture look more enterprise-grade.

A future design can introduce them when there is an actual requirement.

For the first workshop product:

```text
App Service
Functions
Cosmos DB
Blob Storage
Application Insights
```

is the approved core Azure service set.

---

## 18. Decision: Local Run Must Remain Possible

### Decision
The application should be runnable locally without requiring a deployed Azure environment for basic UI development.

For local development, use documented environment configuration and, where necessary, safe local mocks/dev containers or emulator-compatible options.

The cloud build remains the source of truth for the event deployment.

### Rejected

**Cloud-only local development**
- Makes UI iteration slow and makes contributors dependent on Azure availability during development.

**A completely separate local architecture**
- Would create drift between local and cloud versions.

---

## 19. Decision: No Premature Enterprise Architecture

FactoryGuard should look like a strong prototype, not a fake Fortune 500 platform with 15 distributed components.

Do not introduce:
- Microservice explosion.
- CQRS/event sourcing.
- Service mesh.
- Kubernetes.
- Distributed cache.
- Multiple databases.
- API gateway layers.
- Complex workflow engines.

unless a later requirement explicitly justifies them.

The project is judged by whether students can understand and deploy it, not by the number of boxes in the architecture diagram.

---

## 20. Final Technology Baseline

The coding agent should begin from this baseline unless the user explicitly changes it:

```text
Frontend/Web:
  Next.js + TypeScript + Tailwind CSS

Hosting:
  Azure App Service

Backend/Event Processing:
  Azure Functions + TypeScript/Node.js

Database:
  Azure Cosmos DB for NoSQL

Object Storage:
  Azure Blob Storage

Observability:
  Application Insights / Azure Monitor

Source Control:
  GitHub

Infrastructure as Code:
  Deferred. No Bicep in the initial build.
```

Any proposed deviation must explain which requirement it solves and what existing decision it replaces.
