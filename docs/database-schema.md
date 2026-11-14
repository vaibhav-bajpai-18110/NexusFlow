# NexusFlow Database Schema Design

## 1. Overview
NexusFlow uses MongoDB to store user accounts, IoT device information,
and real-time telemetry readings.

## 2. User Model

Collection: users

Fields:
- _id: ObjectId (Primary Identifier)
- name: String (Required)
- email: String (Required, Unique)
- passwordHash: String (Required)
- role: String (Default: user)
- createdAt: Date
- updatedAt: Date

Validation:
- Name and email are required.
- Email must be unique and valid.
- Password must be stored as a secure hash, never plaintext.

## 3. Device Model

Collection: devices

Fields:
- _id: ObjectId (Primary Identifier)
- deviceId: String (Required, Unique)
- name: String (Required)
- deviceType: String
- owner: ObjectId (Reference to User)
- status: String (online, offline, unknown)
- location: Object
- createdAt: Date
- updatedAt: Date

Validation:
- Device ID must be unique.
- Device name is required.
- Owner references an existing user.
- Status must use an allowed value.

## 4. Telemetry Model

Collection: telemetry

Fields:
- _id: ObjectId
- deviceId: ObjectId (Reference to Device)
- timestamp: Date (Required)
- metric: String (Required)
- value: Number (Required)
- unit: String
- metadata: Object

Validation:
- Device reference is required.
- Timestamp must be valid.
- Metric name is required.
- Value must be numeric.

## 5. Relationships

- One User can own multiple Devices.
- One Device can generate multiple Telemetry records.
- Each Telemetry record belongs to one Device.

## 6. Time-Series Strategy

MongoDB Time-Series Collections are planned for
high-volume telemetry storage.

- Time field: timestamp
- Meta field: deviceId
- Granularity: seconds

The final collection configuration will be
validated during database implementation.

## 7. Indexing Strategy

- Unique index on User email.
- Unique index on Device deviceId.
- Index on Telemetry deviceId and timestamp.

## 8. Security

- Passwords must never be stored in plaintext.
- Database credentials must be stored in environment variables.
- Database access must be restricted.
- Input validation must be applied before storing data.

## 9. Future Extensions

The database may later support:
- Automation rules
- Alerts and notifications
- Device groups
- Telemetry analytics
