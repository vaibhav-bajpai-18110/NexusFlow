# NexusFlow API Contract

## 1. Overview

NexusFlow is a Visual IoT Telemetry and Rule Engine platform designed to collect, store, monitor, and process IoT device telemetry data.

This document describes the API contract for communication between the frontend, backend, and database services.

The API contract defines request formats, response structures, validation requirements, and error handling.

## 2. API Base URL

The backend API base URL depends on the environment.

- Local development: `http://localhost:<PORT>`
- Production: To be configured during deployment.

The backend port and production URL must be confirmed from the server configuration.

## 3. Telemetry Ingestion API

### Purpose

The telemetry ingestion API accepts sensor readings from IoT devices and stores them for monitoring and further processing.

### Endpoint

`POST /api/telemetry`

The exact route should be verified against the backend implementation before integration.

### Request Headers

```http
Content-Type: application/json
```

### Request Body

```json
{
  "deviceId": "device-001",
  "sensorId": "sensor-001",
  "timestamp": "2026-11-22T10:30:00.000Z",
  "metric": "temperature",
  "value": 28.5,
  "unit": "C"
}
```

### Field Description

| Field | Type | Description |
|---|---|---|
| deviceId | String | Unique identifier of the IoT device |
| sensorId | String | Identifier of the sensor |
| timestamp | Date/String | Time when the reading was recorded |
| metric | String | Name of the measured parameter |
| value | Number | Sensor reading |
| unit | String | Measurement unit |

All fields are required according to the current telemetry model.

### Successful Response

The following is a proposed response structure. The actual response must match the implemented backend service.

```json
{
  "success": true,
  "message": "Telemetry received successfully",
  "data": {
    "deviceId": "device-001",
    "sensorId": "sensor-001",
    "metric": "temperature",
    "value": 28.5,
    "unit": "C"
  }
}
```

### Validation

The backend should validate the following:

- Required fields must be present.
- `deviceId`, `sensorId`, `metric`, and `unit` must be non-empty strings.
- `timestamp` must contain a valid date and time.
- `value` must be a valid numeric value.

Invalid requests should return an appropriate client error response.

## 4. Device Telemetry Query API

### Purpose

This API retrieves telemetry records associated with a particular device.

### Endpoint

`GET /api/telemetry/device/:deviceId`

The exact route and query parameters must be confirmed from the backend implementation.

### Example

```http
GET /api/telemetry/device/device-001
```

The response should contain the telemetry records associated with the requested device.

## 5. Rule Engine API

The Rule Engine evaluates telemetry data against configured conditions and supports automated monitoring.

The Rules API contract is currently pending finalization.

The following details must be documented once the backend API is available:

- Rule creation and update endpoints
- Rule condition format
- Rule evaluation behavior
- Rule activation and deactivation
- Rule execution response
- Validation and error responses

No endpoint or request structure is considered finalized until it is confirmed by the backend implementation.

## 6. Error Handling

The API should return appropriate HTTP status codes.

| Status Code | Meaning |
|---|---|
| 200 | Request completed successfully |
| 201 | Resource created successfully |
| 400 | Invalid request or validation failure |
| 404 | Requested resource not found |
| 500 | Internal server error |

The exact status codes depend on the implemented endpoint behavior.

## 7. Integration Notes

- The frontend should use the configured backend base URL.
- Request and response formats must remain consistent between frontend and backend.
- The backend implementation is the source of truth for API routes and response structures.
- Rules API documentation must be updated after its contract is finalized.

## 8. Status

Telemetry model and service implementation are part of the current backend development.

API route verification and the final Rules API contract are pending.

This document should be updated whenever the API implementation changes.