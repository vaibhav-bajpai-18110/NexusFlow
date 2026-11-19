# NexusFlow Backend API Verification & Testing Report
**Project:** NexusFlow – Visual IoT Telemetry & Rule Engine  
**Author:** Rakesh (Backend Developer)  
**Branch:** `Rakesh-dev`  
**Test Suite Status:** 42/42 Tests Passing (100% Success)  
**Date:** November 19, 2026  

---

## 1. Executive Summary
This report documents the review, hardening, and verification of the **NexusFlow Backend REST APIs**. The backend architecture delivers:
- **Consistent Express.js foundation** with helmet security headers, CORS origin controls, structured JSON parsing, and unified logging.
- **Strict input validation** across all Device Management and Telemetry Ingestion routes.
- **Standardized error handling** ensuring consistent `{ success: false, status: "fail" | "error", message, details }` payloads across HTTP `400`, `404`, `409`, and `500`.
- **Seamless Telemetry-to-Device live linking** where ingested sensor data instantly updates device operational status (`online`), records latest metric values (`lastValue`), and sets `lastSeen` timestamps.
- **MongoDB / Mongoose ODM readiness** with aligned schema specifications in `src/models/` matching the presentation architecture (Slide 08 & Slide 12).

---

## 2. API Endpoint Verification Matrix

| # | Endpoint | Method | Purpose | Expected Status | Validation / Edge Cases |
|---|---|---|---|---|---|
| 1 | `/api/health` | GET | System health & uptime check | `200 OK` | Returns memory (rss, heap), uptime, service name |
| 2 | `/api/devices` | GET | List all registered devices | `200 OK` | Supports `?status=online\|offline`, `?type=...`, `?search=...` |
| 3 | `/api/devices/stats` | GET | Operations overview device counts | `200 OK` | Returns total, online, offline, and breakdown by type |
| 4 | `/api/devices/:id` | GET | Get single device by ID | `200 OK` / `404 Not Found` | Case-insensitive ID lookup; returns 404 if not found |
| 5 | `/api/devices` | POST | Register a new IoT device | `201 Created` / `400` / `409` | Validates ID format, name, status; checks duplicates (409) |
| 6 | `/api/devices/:id` | PUT | Update device metadata | `200 OK` / `400` / `404` | Rejects deviceId mutation (400); validates fields |
| 7 | `/api/devices/:id` | PATCH | Partial update of device metadata | `200 OK` / `400` / `404` | Rejects empty bodies (400); updates provided fields |
| 8 | `/api/devices/:id` | DELETE | Delete device by ID | `200 OK` / `404 Not Found` | Deletes record; subsequent lookups return 404 |
| 9 | `/api/telemetry` | POST | Ingest sensor telemetry | `201 Created` / `400` | Requires deviceId + at least 1 numeric sensor metric |
| 10 | `/api/telemetry/ingest` | POST | Ingestion alias endpoint | `201 Created` / `400` | Equivalent to `POST /api/telemetry` |
| 11 | `/api/telemetry/latest` | GET | Get latest readings for all devices | `200 OK` | Returns latest reading snapshot per device |
| 12 | `/api/telemetry/:deviceId` | GET | Latest reading for specific device | `200 OK` / `404 Not Found` | Returns latest snapshot for device |
| 13 | `/api/telemetry/history` | GET | Recent telemetry buffer history | `200 OK` | Supports `?deviceId=...` and `?limit=...` |
| 14 | `/api/telemetry/stats` | GET | Operational ingestion statistics | `200 OK` | Ingestion count, active devices count, buffer count |

---

## 3. Standardized Error Handling Architecture
All API error responses follow an operational schema without leaking internal stack traces in production:

```json
{
  "success": false,
  "status": "fail",
  "message": "Human-readable summary of the error",
  "details": [
    {
      "field": "fieldName",
      "message": "Specific field validation failure description"
    }
  ]
}
```

### Handled Error Categories:
- **`400 Bad Request`**: Malformed JSON payloads, missing required fields (`deviceId`, sensor metrics), invalid types (strings where numbers expected), invalid status values, attempts to alter immutable `deviceId` in updates.
- **`404 Not Found`**: Requesting unknown routes, querying unregistered device IDs, or querying telemetry for unseen devices.
- **`409 Conflict`**: Registering a device with an ID that already exists.
- **MongoDB ODM Ready**: `errorHandler.js` includes automated normalization for MongoDB duplicate key `code: 11000` (`409 Conflict`), Mongoose `ValidationError` (`400 Bad Request`), and Mongoose `CastError` (`400 Bad Request`).

---

## 4. Telemetry-to-Device Integration Verification
When sensor data arrives at `POST /api/telemetry`:
1. **Device Status Update:** Devices with status `offline` automatically transition to `online`.
2. **Last Value Update:** The primary sensor metric (e.g. `temperature`, `pressure`, or `vibration`) is stored as `lastValue`.
3. **Last Seen Timestamp:** Automatically stamped with the telemetry receipt time.
4. **Auto-Discovery:** Unregistered devices sending telemetry are automatically registered with `online` status and an inferred primary metric type.

---

## 5. Sample Request & Response Payloads

### A. Device Registration (`POST /api/devices`)
**Request:**
```json
{
  "deviceId": "GENERATOR_005",
  "name": "Generator 05",
  "type": "Temperature",
  "unit": "°C",
  "location": "Power Plant Substation 3",
  "description": "Backup diesel generator unit",
  "status": "offline"
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "status": "success",
  "message": "Device registered successfully",
  "data": {
    "deviceId": "GENERATOR_005",
    "name": "Generator 05",
    "type": "Temperature",
    "unit": "°C",
    "status": "offline",
    "lastValue": null,
    "location": "Power Plant Substation 3",
    "description": "Backup diesel generator unit",
    "metadata": {},
    "lastSeen": null,
    "createdAt": "2026-11-19T13:47:57.460Z",
    "updatedAt": "2026-11-19T13:47:57.460Z"
  }
}
```

### B. Duplicate Device ID (`POST /api/devices`)
**Request:**
```json
{
  "deviceId": "TURBINE_001",
  "name": "Duplicate Turbine"
}
```
**Response (`409 Conflict`):**
```json
{
  "success": false,
  "status": "fail",
  "message": "Device with ID \"TURBINE_001\" already exists"
}
```

### C. Telemetry Ingestion (`POST /api/telemetry`)
**Request:**
```json
{
  "deviceId": "TURBINE_001",
  "temperature": 85,
  "pressure": 42,
  "timestamp": "2026-11-12T09:00:00.000Z"
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "status": "success",
  "message": "Telemetry data ingested successfully",
  "data": {
    "deviceId": "TURBINE_001",
    "timestamp": "2026-11-12T09:00:00.000Z",
    "metrics": {
      "temperature": 85,
      "pressure": 42
    },
    "temperature": 85,
    "pressure": 42,
    "receivedAt": "2026-11-19T13:47:57.446Z",
    "ingestedAt": "2026-11-19T13:47:57.447Z"
  }
}
```

### D. Validation Failure (`POST /api/telemetry`)
**Request:**
```json
{
  "deviceId": "TURBINE_001",
  "temperature": "very-hot"
}
```
**Response (`400 Bad Request`):**
```json
{
  "success": false,
  "status": "fail",
  "message": "Validation failed for telemetry data",
  "details": [
    {
      "field": "temperature",
      "message": "Metric \"temperature\" must be a valid number, received string"
    }
  ]
}
```

---

## 6. Automated Test Results
All 42 automated tests pass across 14 test suites:
```text
▶ Device Registry API (/api/devices)
  ✔ returns default seeded demo devices
  ✔ filters devices by status=offline
  ✔ filters devices by status=online
  ✔ filters devices by type=Vibration
  ✔ searches devices by text query
  ✔ returns accurate device count and status statistics
  ✔ returns specific device by deviceId (case-insensitive)
  ✔ returns 404 for unknown deviceId
  ✔ registers a new device successfully
  ✔ returns 400 when deviceId is missing
  ✔ returns 400 when deviceId has invalid characters
  ✔ returns 400 when status is invalid
  ✔ returns 409 Conflict when deviceId already exists
  ✔ updates device metadata successfully
  ✔ returns 400 when trying to modify immutable deviceId
  ✔ returns 404 when updating non-existent device
  ✔ deletes device and prevents subsequent lookups
  ✔ returns 404 when deleting non-existent device
  ✔ transitions offline device to online and updates lastValue when telemetry arrives
  ✔ auto-discovers and registers a brand new device on telemetry ingestion
  ✔ validates device object against Device schema specification

▶ Backend server & /api/health
  ✔ GET /api/health returns 200 with service health payload
  ✔ returns 404 JSON error for unknown routes
  ✔ returns 400 JSON error for malformed JSON payload

▶ Telemetry Ingestion API (POST /api/telemetry)
  ✔ successfully ingests valid telemetry event from PPT sample
  ✔ auto-generates ISO timestamp when timestamp is omitted
  ✔ supports POST /api/telemetry/ingest alias
  ✔ supports nested metrics payload structure
  ✔ supports batch telemetry ingestion via array
  ✔ returns 400 when body is empty object
  ✔ returns 400 when deviceId is missing
  ✔ returns 400 when deviceId is empty or whitespace
  ✔ returns 400 when no sensor metrics are provided
  ✔ returns 400 when metric value is not a valid number
  ✔ returns 400 when timestamp format is invalid
  ✔ returns 400 when batch item fails validation with indexed path
  ✔ GET /api/telemetry/latest returns all latest devices
  ✔ GET /api/telemetry/:deviceId returns latest data for specific device
  ✔ GET /api/telemetry/:deviceId returns 404 for unknown device
  ✔ GET /api/telemetry/history returns recent history and supports limit
  ✔ GET /api/telemetry/stats returns accurate statistics
  ✔ validates telemetry object against Telemetry schema specification

Total: 42 tests | 14 suites | 42 passed | 0 failed
```
