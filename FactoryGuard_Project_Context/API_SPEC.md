# FactoryGuard - API Specification

## 1. API Principles

FactoryGuard uses REST-style JSON APIs for the workshop application.

The initial public-facing API is exposed through the Next.js application's server-side API/proxy routes. Those routes may call Azure Functions for backend/event processing.

The exact Azure Function trigger URLs are an infrastructure/deployment concern and must not be hard-coded into the UI.

### General conventions

- Content type: `application/json`.
- Dates/times: ISO 8601 UTC strings.
- IDs: stable string IDs, preferably UUIDs for event-like objects and readable IDs for fictional machines where useful.
- Pagination/limits: use explicit limits for telemetry and incident lists.
- Errors: JSON with a stable `code` and human-readable `message`.

---

## 2. Authentication Approach

### Workshop

No end-user login is required.

The browser communicates with the App Service web application. Server-side routes perform backend calls. Internal Function authentication, if enabled, is server-side only.

Do not expose:
- Function keys.
- Storage connection strings.
- Cosmos keys.
- Internal tokens.

in client-side JavaScript, HTML, or public environment variables.

### Future

Entra ID/OAuth/RBAC may be introduced later. Do not implement it as a dependency of the first workshop build.

---

## 3. Common Response Format

Successful responses may use a direct JSON object for simple endpoints.

For collection endpoints, prefer:

```json
{
  "items": [],
  "count": 0,
  "limit": 25
}
```

Error format:

```json
{
  "error": {
    "code": "MACHINE_NOT_FOUND",
    "message": "The requested machine does not exist.",
    "requestId": "optional-request-id"
  }
}
```

Do not return stack traces to users.

---

# 4. Health

## `GET /api/health`

Returns basic application readiness.

### Response `200`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-01-01T10:00:00.000Z",
  "dependencies": {
    "cosmos": "ok",
    "storage": "ok"
  }
}
```

Dependency checks may be lightweight or omitted from the response if they would make health checks expensive. The endpoint must remain fast.

---

# 5. Dashboard

## `GET /api/dashboard/summary`

Returns the data required by the main plant overview.

### Response

```json
{
  "plant": {
    "machineCount": 24,
    "normalCount": 19,
    "warningCount": 4,
    "criticalCount": 1,
    "activeIncidentCount": 5,
    "healthScore": 82
  },
  "recentIncidents": [
    {
      "id": "inc-001",
      "machineId": "CNC-02",
      "severity": "WARNING",
      "title": "Abnormal vibration detected",
      "status": "OPEN",
      "detectedAt": "2026-01-01T10:00:00.000Z"
    }
  ],
  "generatedAt": "2026-01-01T10:00:01.000Z"
}
```

This endpoint should prefer server-side aggregation over making the browser call many separate endpoints.

---

# 6. Machines

## `GET /api/machines`

Returns the machine registry.

### Optional query parameters

```text
status=NORMAL|WARNING|CRITICAL
line=<line-name>
limit=<integer>
search=<text>
```

### Response

```json
{
  "items": [
    {
      "id": "CNC-02",
      "name": "CNC Machining Unit 02",
      "machineType": "CNC",
      "line": "Precision Line A",
      "location": "Bay A-02",
      "status": "WARNING",
      "healthScore": 68,
      "lastTelemetryAt": "2026-01-01T10:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 25
}
```

## `GET /api/machines/:machineId`

Returns machine details.

### Response

```json
{
  "machine": {
    "id": "CNC-02",
    "name": "CNC Machining Unit 02",
    "machineType": "CNC",
    "line": "Precision Line A",
    "location": "Bay A-02",
    "status": "WARNING",
    "healthScore": 68,
    "lastTelemetryAt": "2026-01-01T10:00:00.000Z"
  },
  "latestTelemetry": {
    "id": "tel-001",
    "timestamp": "2026-01-01T10:00:00.000Z",
    "temperatureC": 78,
    "vibrationMmS": 7.1,
    "pressurePsi": 107,
    "scenario": "WARNING",
    "source": "simulator"
  },
  "activeIncidents": [],
  "documents": []
}
```

---

# 7. Telemetry

## `GET /api/machines/:machineId/telemetry`

Returns recent telemetry for a machine.

### Query parameters

```text
limit=<integer, default 20>
from=<ISO timestamp, optional>
to=<ISO timestamp, optional>
```

### Response

```json
{
  "machineId": "CNC-02",
  "items": [
    {
      "id": "tel-001",
      "timestamp": "2026-01-01T10:00:00.000Z",
      "temperatureC": 78,
      "vibrationMmS": 7.1,
      "pressurePsi": 107,
      "operatingHours": 1820,
      "scenario": "WARNING",
      "source": "simulator"
    }
  ],
  "count": 1,
  "limit": 20
}
```

Do not return unlimited telemetry history.

---

# 8. Incidents

## `GET /api/incidents`

Returns incidents.

### Query parameters

```text
status=OPEN|RESOLVED
severity=WARNING|CRITICAL
machineId=<machine-id>
limit=<integer>
```

### Response

```json
{
  "items": [
    {
      "id": "inc-001",
      "machineId": "CNC-02",
      "severity": "WARNING",
      "type": "VIBRATION",
      "title": "Abnormal vibration detected",
      "description": "Vibration exceeded the warning threshold.",
      "status": "OPEN",
      "detectedAt": "2026-01-01T10:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 25
}
```

## `GET /api/incidents/:incidentId`

Returns a single incident including its triggering telemetry snapshot.

---

# 9. Simulation API

Simulation endpoints exist specifically for the workshop and demo.

## `POST /api/simulations/events`

Triggers a deterministic telemetry scenario for a machine.

### Request

```json
{
  "machineId": "CNC-02",
  "scenario": "CRITICAL"
}
```

Allowed scenarios:

```text
NORMAL
WARNING
CRITICAL
RECOVERY
```

### Response `200`

```json
{
  "success": true,
  "scenario": "CRITICAL",
  "machine": {
    "id": "CNC-02",
    "status": "CRITICAL",
    "healthScore": 28
  },
  "telemetry": {
    "id": "tel-002",
    "temperatureC": 96,
    "vibrationMmS": 11.8,
    "pressurePsi": 119,
    "scenario": "CRITICAL",
    "source": "simulator"
  },
  "incident": {
    "id": "inc-002",
    "severity": "CRITICAL",
    "status": "OPEN"
  }
}
```

### Validation errors

Invalid machine ID:

```http
404 Not Found
```

Unsupported scenario:

```http
400 Bad Request
```

### Domain requirements

The endpoint must:
1. Validate input.
2. Generate deterministic telemetry for the scenario.
3. Run anomaly evaluation.
4. Update machine state.
5. Create/update incident state when required.
6. Persist all durable state.
7. Emit observability signals.
8. Return the resulting state.

---

## `POST /api/simulations/reset`

Resets the designated demo machine or selected machine to a normal state.

### Request

```json
{
  "machineId": "CNC-02"
}
```

### Response

```json
{
  "success": true,
  "machineId": "CNC-02",
  "status": "NORMAL",
  "resolvedIncidentIds": ["inc-002"]
}
```

This is a workshop recovery mechanism. Keep it deterministic.

---

# 10. Documents

## `GET /api/documents`

Optional query parameters:

```text
machineId=<id>
category=MANUAL|MAINTENANCE|INSPECTION|REPORT
```

### Response

```json
{
  "items": [
    {
      "id": "doc-001",
      "machineId": "CNC-02",
      "name": "CNC-02 Maintenance Procedure.pdf",
      "category": "MAINTENANCE",
      "contentType": "application/pdf",
      "sizeBytes": 18432,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

## `GET /api/documents/:documentId/download-url`

Returns a short-lived signed URL or equivalent access mechanism.

### Response

```json
{
  "documentId": "doc-001",
  "url": "https://example.invalid/signed-url",
  "expiresAt": "2026-01-01T10:15:00.000Z"
}
```

The example URL above is illustrative only. Never place real secrets in documentation.

---

# 11. Function-Level API Mapping

The exact Azure Function names may differ, but conceptually the backend should contain operations equivalent to:

```text
POST  function/telemetry
POST  function/simulations/events
POST  function/simulations/reset
GET   function/machines
GET   function/machines/{machineId}
GET   function/machines/{machineId}/telemetry
GET   function/incidents
GET   function/documents
GET   function/documents/{documentId}/download-url
GET   function/health
```

Whether the Next.js layer exposes exactly the same paths is an implementation choice. The browser-facing API should favor stable application semantics over exposing Azure Function implementation details.

---

# 12. Status Codes

Use standard HTTP semantics:

| Code | Meaning |
|---|---|
| 200 | Successful read/update/action. |
| 201 | New resource created where appropriate. |
| 400 | Invalid request. |
| 404 | Resource not found. |
| 409 | Conflicting state where applicable. |
| 422 | Validation failure if using a validation-oriented convention. |
| 429 | Rate limiting if introduced later. |
| 500 | Unexpected server-side failure. |
| 503 | Dependency/service unavailable or application not ready. |

Do not return `200` for an operation that actually failed.

---

# 13. Validation Rules

At minimum:

### Machine ID
- Required.
- Must correspond to an existing machine.

### Scenario
- Required.
- Must be one of `NORMAL`, `WARNING`, `CRITICAL`, `RECOVERY`.

### Query limits
- Must be bounded.
- Apply server-side maximums even if clients request a larger number.

Never trust client-provided health status, incident severity, or anomaly classification. Those are server-derived values.

---

# 14. API Error Codes

Recommended stable codes:

```text
INVALID_REQUEST
INVALID_SCENARIO
MACHINE_NOT_FOUND
INCIDENT_NOT_FOUND
DOCUMENT_NOT_FOUND
COSMOS_UNAVAILABLE
BLOB_STORAGE_UNAVAILABLE
FUNCTION_UNAVAILABLE
VALIDATION_ERROR
INTERNAL_ERROR
```

Frontend behavior should branch on stable error codes where user-visible recovery behavior differs.

---

# 15. Observability Requirements for APIs

For each simulation request, record structured telemetry containing where possible:

```text
operation = simulation
machineId
scenario
resultStatus
incidentId
requestId
executionDurationMs
```

Do not log:
- Secrets.
- Access keys.
- Connection strings.
- Authentication tokens.
- Full request headers.

---

# 16. API Design Guardrails

1. Do not expose Cosmos DB queries directly to the browser.
2. Do not expose Azure SDK clients to React components.
3. Do not trust client-provided machine status or severity.
4. Keep simulation operations deterministic.
5. Do not introduce GraphQL, gRPC, or a large API gateway for the first build.
6. Keep REST/JSON because it is easiest to demonstrate and troubleshoot during the workshop.
7. Keep Azure Function implementation details behind stable application endpoints.
