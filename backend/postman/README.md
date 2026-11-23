# NexusFlow Postman Testing Guide

This directory contains the ready-to-import Postman Collection and Environment for testing the **NexusFlow Backend Device Management & Telemetry APIs**.

## Files Included

1. `NexusFlow_Device_API.postman_collection.json` — 14 pre-configured API requests covering:
   - Device Registration (`POST /api/devices`)
   - Fetch All Devices (`GET /api/devices`)
   - Fetch Device by ID (`GET /api/devices/:id`)
   - Duplicate Device ID Handling (`409 Conflict`)
   - Input Validation Errors (`400 Bad Request`)
   - Non-existent Device Lookup (`404 Not Found`)
   - Device Updates (`PUT /api/devices/:id`)
   - Device Deletion (`DELETE /api/devices/:id`)
   - Filter & Search endpoints (`?status=online`, `?search=Boiler`)
   - Device Registry Statistics (`GET /api/devices/stats`)
   - Telemetry Ingestion (`POST /api/telemetry`)
   - Server Health Check (`GET /api/health`)
2. `NexusFlow_Local.postman_environment.json` — Environment with `baseUrl = http://localhost:5000`.

## How to Test in Postman

1. **Start the NexusFlow backend server:**
   ```powershell
   cd backend
   npm run dev
   ```
2. **Open Postman.**
3. Click the **Import** button in Postman (top-left).
4. Drag and drop both JSON files from `backend/postman/`:
   - `NexusFlow_Device_API.postman_collection.json`
   - `NexusFlow_Local.postman_environment.json`
5. Select the **NexusFlow - Local Environment** in the top-right environment selector (or the collection will default to `http://localhost:5000`).
6. Click **Run Collection** to run all 14 tests in sequence, or click each request individually!
