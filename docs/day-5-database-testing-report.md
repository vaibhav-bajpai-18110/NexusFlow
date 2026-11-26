# Day 5 – Database Testing Report
**Project:** NexusFlow  
**Role:** Database Developer & Tester (Manya)  
**Branch:** Manya-dev  
**Date:** 26 November 2026
## 1. Objective
The objective of Day 5 was to review the existing MongoDB models and database services, verify model compatibility and validation rules, improve automated tests, and check successful and unsuccessful database operations and error handling.
## 2. Models Reviewed
### Device Model
- `deviceId` is a required, unique String.
- `name` is required and has length validation.
- `owner` is a required ObjectId referencing the User model.
- `status` supports online, offline, and unknown.
- Latitude and longitude have geographical range validation.
- Timestamps are enabled.
### Telemetry Model
- `deviceId` and `sensorId` are required Strings.
- `timestamp` is a required Date.
- `metric` and `unit` are required Strings.
- `value` is a required finite Number.
- `metadata` uses Mixed type with an empty object as its default.
- The collection is configured as a time-series collection.
### Compatibility Review
The Device and Telemetry models both use String type for `deviceId`, so their device ID field types are compatible.
The Telemetry model does not currently enforce a database reference to an existing Device record. No schema changes were made.
## 3. Services Reviewed
The existing telemetry service provides:
- `saveTelemetry()` – creates and saves telemetry records.
- `getTelemetryByDevice()` – retrieves telemetry records for a device, sorted by newest timestamp first.
The retrieval service was improved to reject missing, empty, whitespace-only, and non-string device IDs. It also trims the device ID before querying.
No existing schema fields or collection structures were changed.
## 4. Database Connection Testing
The database connection module was tested for:
1. Missing MongoDB connection URI.
2. MongoDB connection failure.
3. Successful mocked connection.
The connection module reports errors and propagates them to the caller.
## 5. Test Cases and Results
| Test area | Test cases | Passed | Failed |
|---|---:|---:|---:|
| Database connection | 3 | 3 | 0 |
| Device model | 9 | 9 | 0 |
| Telemetry model | 10 | 10 | 0 |
| Telemetry service | 7 | 7 | 0 |
| User model | 8 | 8 | 0 |
| **Total** | **37** | **37** | **0** |
### Important Test Scenarios
- Valid and invalid Device records.
- Required Device fields and geographical validation.
- Valid and invalid Telemetry records.
- Required telemetry fields and finite numeric values.
- Successful telemetry creation using a mocked model operation.
- Rejection of invalid telemetry data.
- Database errors during telemetry creation and retrieval.
- Retrieval in descending timestamp order.
- Device ID trimming and invalid ID rejection.
- Missing MongoDB URI and connection error handling.
## 6. CRUD Verification
The existing telemetry service provides:
- **Create:** `saveTelemetry()`
- **Read:** `getTelemetryByDevice()`
Update and Delete operations are not present in the reviewed telemetry service and were not claimed as tested.
## 7. Test Execution
Command:
`npm.cmd test`
Test framework: Node.js built-in test runner (`node --test`).
Result:
- Total tests: 37
- Passed: 37
- Failed: 0
- Cancelled: 0
- Skipped: 0
## 8. Limitations
No live MongoDB connection was tested because a MongoDB URI was not configured in this worktree.
Database connection and service error scenarios were tested using mocks. Therefore, these results verify application logic and error handling, not live database connectivity or actual persisted CRUD operations.
## 9. Conclusion
The existing Device, Telemetry, and User models were reviewed. Telemetry service validation and error-handling tests were improved, and database connection tests were added.
All 37 automated tests passed successfully. No model schema or collection structure changes were made.
