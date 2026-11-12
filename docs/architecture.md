
# NexusFlow - System Architecture

## 1. Overview
NexusFlow is a real-time IoT telemetry monitoring and visual rule automation platform.

## 2. System Workflow

IoT Devices / Simulator
        |
        v
Backend Data Ingestion
        |
        v
MongoDB Database
        |
        v
RxJS Rule Engine
        |
        v
Rule Evaluation
        |
        v
WebSocket Communication
        |
        v
React Dashboard

## 3. Main Components

### Frontend
React provides the interactive dashboard.
React Flow provides visual rule-building functionality.
Recharts displays telemetry analytics.

### Backend
Node.js and Express handle API requests.
WebSockets provide real-time communication.
RxJS handles reactive telemetry processing and rule evaluation.

### Database
MongoDB stores device information, telemetry records, users and related application data.
Time-Series Collections are planned for telemetry storage.

### Rule Engine
Processes incoming telemetry and evaluates configured conditions.
Matching conditions can trigger alerts or actions.

## 4. Core Modules
- Device Management
- Telemetry Ingestion
- Real-Time Monitoring
- Visual Rule Builder
- Rule Engine
- Alerts and Notifications
- Analytics

## 5. Development Strategy
The project will be developed over 22 days with separate frontend, backend, database and integration responsibilities.
