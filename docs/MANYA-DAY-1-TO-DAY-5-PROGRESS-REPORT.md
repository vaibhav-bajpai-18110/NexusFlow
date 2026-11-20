# NexusFlow – Database Development Progress Report (Day 1–Day 5)

**Project:** NexusFlow – Visual IoT Telemetry & Rule Engine  
**Team Member:** Manya  
**Role:** Database Developer  
**Branch:** Manya-dev  
**Reporting Period:** Day 1 to Day 5

## 1. Project Overview

NexusFlow is a Visual IoT Telemetry and Rule Engine designed to collect, process, store, and visualize IoT device data.

As the Database Developer, my responsibility is to design and maintain the database architecture, implement MongoDB models, develop database services, ensure data validation, and perform database-related testing.

## 2. Day-Wise Development Activities

### Day 1 – Database Architecture and Schema Design

- Researched MongoDB database architecture.
- Designed the initial database structure.
- Planned User, Device, and Telemetry collections.
- Defined relationships between database entities.
- Studied indexing and time-series data storage.
- Documented database validation and security requirements.
- Prepared the database implementation plan.

**Documentation:**
- `docs/database-schema.md`
- `docs/database-architecture.md`

### Day 2 – Telemetry Model Development

- Worked on the Telemetry database model.
- Defined required telemetry fields.
- Added validation requirements for device ID and sensor ID.
- Defined timestamp, metric, value, and unit fields.
- Implemented telemetry data storage functionality.
- Added device-wise telemetry retrieval functionality.
- Prepared model and service testing.

**Main Files:**
- `server/src/models/Telemetry.js`
- `server/src/services/telemetryService.js`

### Day 3 – Database Integration and Verification

- Continued database integration with the backend.
- Worked on MongoDB Atlas connectivity.
- Verified database model compatibility.
- Supported backend data persistence requirements.
- Reviewed database-related API requirements.
- Performed database and integration verification.

### Day 4 – Device Models and Database Services

- Worked on device-related database models.
- Developed database service functionality.
- Improved database operations and data handling.
- Added relevant model and service tests.
- Verified compatibility with existing backend modules.

### Day 5 – Database Development and Testing

- Continued development of database models and services.
- Reviewed existing database architecture.
- Improved schema and data validation consistency.
- Verified model and service compatibility with backend APIs.
- Performed testing of database functionality.
- Reviewed imports, dependencies, and project file structure.

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| MongoDB | NoSQL database |
| MongoDB Atlas | Cloud database hosting |
| Mongoose | Database modeling |
| Node.js | Backend runtime |
| Express.js | Backend API framework |
| JavaScript | Database service implementation |
| Jest | Testing |
| Git & GitHub | Version control |

## 4. Database Architecture

The database architecture is designed around the following main collections:

**User Collection**
- Stores user-related information.
- Supports user identification and management.

**Device Collection**
- Stores IoT device information.
- Maintains device-related details.

**Telemetry Collection**
- Stores sensor readings.
- Maintains device ID, sensor ID, timestamp, metric, value, and unit.

## 5. Development and Testing

Database development focused on:

- Schema design and validation.
- Telemetry data storage.
- Device-wise data retrieval.
- Database service implementation.
- Model testing.
- Backend compatibility.
- Data consistency and error handling.

## 6. Challenges and Learning

During the initial development phase, the following areas required attention:

- Understanding MongoDB schema design.
- Maintaining consistent data structures.
- Managing database connectivity.
- Ensuring compatibility between models and backend APIs.
- Testing database operations.
- Maintaining modular and reusable database services.

## 7. GitHub Contribution

All database-related development activities were maintained through Git version control.

**Development Branch:** Manya-dev

Development practices:
- Meaningful commits.
- Organized database modules.
- Proper documentation.
- Testing before integration.
- Maintaining compatibility with the main project architecture.

## 8. Current Progress

By the end of Day 5, the database development work had progressed through initial architecture planning, telemetry model development, database services, device-related model development, and testing.

The next development phase will focus on improving telemetry retrieval, database query functionality, filtering, and integration with the frontend dashboard.

## 9. Conclusion

The first five development days established the foundation of the NexusFlow database layer.

The work covered database architecture, MongoDB schema design, telemetry data modeling, database services, device-related models, and testing.

These components will support the future development of a reliable IoT telemetry monitoring and rule engine system.

---

**Prepared by:** Manya  
**Role:** Database Developer  
**Project:** NexusFlow  
**Branch:** Manya-dev