import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import { WebSocket } from 'ws';
import app from '../src/app.js';
import Device from '../src/models/Device.js';
import Telemetry from '../src/models/Telemetry.js';
import { deviceService } from '../src/services/device.service.js';
import {
  deleteDeviceFromDB,
  getAllDevices,
  getDeviceById,
  saveDevice,
  updateDeviceInDB,
} from '../src/services/persistence.service.js';
import { ruleService } from '../src/services/rule.service.js';
import { ruleEvaluationService } from '../src/services/ruleEvaluation.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { websocketService } from '../src/services/websocket.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('WebSocket & MongoDB CRUD Integration Verification (Task 12)', () => {
  let testServer;
  let wsUrl;

  before(async () => {
    testServer = http.createServer(app);
    websocketService.init(testServer, { path: '/ws' });

    await new Promise((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const port = testServer.address().port;
        wsUrl = `ws://127.0.0.1:${port}/ws`;
        resolve();
      });
    });
  });

  after(async () => {
    await websocketService.close();
    await new Promise((resolve) => {
      testServer.close(resolve);
    });
  });

  beforeEach(() => {
    deviceService.resetToDefaults();
    telemetryService.clear();
    ruleService.resetToDefaults();
    ruleEvaluationService.reset();
  });

  // =========================================================================
  // 1. WebSocket Connection & Handshake Tests
  // =========================================================================
  describe('1. WebSocket Connection & Handshake', () => {
    it('establishes connection and receives welcome handshake message', async () => {
      const ws = new WebSocket(wsUrl);

      const welcomeMsg = await new Promise((resolve, reject) => {
        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data.toString());
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        });
        ws.on('error', reject);
      });

      assert.equal(welcomeMsg.event, 'connected');
      assert.equal(welcomeMsg.type, 'connection');
      assert.match(welcomeMsg.message, /Connected to NexusFlow/);
      assert.ok(welcomeMsg.timestamp);

      ws.close();
    });

    it('responds to ping action with pong event', async () => {
      const ws = new WebSocket(wsUrl);

      await new Promise((resolve) => ws.on('open', resolve));

      const pongPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'pong') {
            resolve(parsed);
          }
        });
      });

      ws.send(JSON.stringify({ action: 'ping' }));
      const pong = await pongPromise;

      assert.equal(pong.event, 'pong');
      assert.equal(pong.type, 'pong');
      assert.ok(pong.timestamp);

      ws.close();
    });

    it('handles device subscription and returns subscription confirmation', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => ws.on('open', resolve));

      const subPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'subscribed') {
            resolve(parsed);
          }
        });
      });

      ws.send(JSON.stringify({ action: 'subscribe', deviceId: 'TURBINE_001' }));
      const subRes = await subPromise;

      assert.equal(subRes.event, 'subscribed');
      assert.equal(subRes.deviceId, 'TURBINE_001');

      ws.close();
    });

    it('handles snapshot request and returns telemetry snapshot', async () => {
      // Ingest sample telemetry
      telemetryService.ingest({
        deviceId: 'MOTOR_002',
        vibration: 2.5,
        timestamp: new Date().toISOString(),
      });

      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => ws.on('open', resolve));

      const snapshotPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'snapshot') {
            resolve(parsed);
          }
        });
      });

      ws.send(JSON.stringify({ action: 'get_latest', deviceId: 'MOTOR_002' }));
      const snapshot = await snapshotPromise;

      assert.equal(snapshot.event, 'snapshot');
      assert.equal(snapshot.data.deviceId, 'MOTOR_002');
      assert.equal(snapshot.data.vibration, 2.5);

      ws.close();
    });
  });

  // =========================================================================
  // 2. Real-Time Telemetry Broadcasting over WebSocket
  // =========================================================================
  describe('2. Real-Time Telemetry & Alert Broadcasting', () => {
    it('broadcasts ingested telemetry to connected WebSocket clients in real-time', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => ws.on('open', resolve));

      const telemetryBroadcastPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'telemetry') {
            resolve(parsed);
          }
        });
      });

      // Post telemetry via REST API
      const res = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 87.2,
          pressure: 43.1,
        }),
      });

      assert.equal(res.status, 201);

      // Verify WebSocket client received the live broadcast
      const broadcast = await telemetryBroadcastPromise;
      assert.equal(broadcast.event, 'telemetry');
      assert.equal(broadcast.deviceId, 'TURBINE_001');
      assert.equal(broadcast.data.temperature, 87.2);
      assert.equal(broadcast.data.pressure, 43.1);

      ws.close();
    });

    it('broadcasts real-time alerts when incoming telemetry breaches an active rule', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => ws.on('open', resolve));

      const alertBroadcastPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'alert') {
            resolve(parsed);
          }
        });
      });

      // Ingest telemetry exceeding TURBINE_001 temperature threshold (> 80)
      const res = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 92.5,
        }),
      });

      assert.equal(res.status, 201);

      const alertMsg = await alertBroadcastPromise;
      assert.equal(alertMsg.event, 'alert');
      assert.equal(alertMsg.deviceId, 'TURBINE_001');
      assert.equal(alertMsg.data.value, 92.5);
      assert.equal(alertMsg.data.threshold, 80);

      ws.close();
    });

    it('broadcasts device status transitions when offline device receives telemetry', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise((resolve) => ws.on('open', resolve));

      const statusBroadcastPromise = new Promise((resolve) => {
        ws.on('message', (data) => {
          const parsed = JSON.parse(data.toString());
          if (parsed.event === 'device:status' && parsed.deviceId === 'PUMP_003') {
            resolve(parsed);
          }
        });
      });

      // Ingest telemetry for offline PUMP_003
      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'PUMP_003',
          pressure: 45.0,
        }),
      });

      const statusMsg = await statusBroadcastPromise;
      assert.equal(statusMsg.event, 'device:status');
      assert.equal(statusMsg.deviceId, 'PUMP_003');
      assert.equal(statusMsg.data.status, 'online');

      ws.close();
    });
  });

  // =========================================================================
  // 3. Device CRUD Operations with MongoDB Layer
  // =========================================================================
  describe('3. Device CRUD Operations with MongoDB Layer', () => {
    it('creates and validates a Device Mongoose document instance', async () => {
      const doc = new Device({
        deviceId: 'TEST_MONGO_DEV',
        name: 'Test Mongo Device',
        deviceType: 'Temperature',
        unit: '°C',
        status: 'online',
        location: 'Lab 4',
      });

      await doc.validate();
      assert.equal(doc.deviceId, 'TEST_MONGO_DEV');
      assert.equal(doc.name, 'Test Mongo Device');
      assert.equal(doc.status, 'online');
    });

    it('saves, retrieves, updates, and deletes devices via service methods', async () => {
      // 1. Create
      const created = await saveDevice({
        deviceId: 'ROBOT_007',
        name: 'Assembly Robot 07',
        type: 'Vibration',
        unit: 'mm/s',
        location: 'Assembly Line 1',
      });

      assert.equal(created.deviceId, 'ROBOT_007');
      assert.equal(created.name, 'Assembly Robot 07');

      // 2. Retrieve by ID
      const retrieved = await getDeviceById('ROBOT_007');
      assert.ok(retrieved);
      assert.equal(retrieved.deviceId, 'ROBOT_007');
      assert.equal(retrieved.location, 'Assembly Line 1');

      // 3. Update
      const updated = await updateDeviceInDB('ROBOT_007', {
        name: 'Assembly Robot 07 RevB',
        location: 'Assembly Line 2',
        status: 'maintenance',
      });

      assert.ok(updated);
      assert.equal(updated.name, 'Assembly Robot 07 RevB');
      assert.equal(updated.location, 'Assembly Line 2');
      assert.equal(updated.status, 'maintenance');

      // 4. List all with filter
      const all = await getAllDevices({ status: 'maintenance' });
      assert.ok(all.some((d) => d.deviceId === 'ROBOT_007'));

      // 5. Delete
      const deleted = await deleteDeviceFromDB('ROBOT_007');
      assert.equal(deleted, true);

      // Verify deletion
      const afterDelete = await getDeviceById('ROBOT_007');
      assert.equal(afterDelete, null);
    });

    it('handles duplicate device registration by throwing 409 error', async () => {
      await assert.rejects(
        () => saveDevice({ deviceId: 'TURBINE_001', name: 'Duplicate' }),
        (err) => err.statusCode === 409 || err.message.includes('already exists')
      );
    });
  });

  // =========================================================================
  // 4. Verification of All Device, Telemetry, and Rule Endpoints & Aliases
  // =========================================================================
  describe('4. Complete API Routes & Response Formats Verification', () => {
    it('verifies GET /api/devices and device filtering', async () => {
      const res = await client('/api/devices?status=online');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.ok(Array.isArray(body.data));
    });

    it('verifies GET /api/devices/:id and 404 for unknown device', async () => {
      const okRes = await client('/api/devices/TURBINE_001');
      assert.equal(okRes.status, 200);

      const notFoundRes = await client('/api/devices/NOT_FOUND_DEV_999');
      assert.equal(notFoundRes.status, 404);
    });

    it('verifies POST, PUT, DELETE /api/devices workflow', async () => {
      // POST
      const postRes = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'GENERATOR_005',
          name: 'Backup Generator',
          type: 'Pressure',
        }),
      });
      const postBody = await postRes.json();
      assert.equal(postRes.status, 201);
      assert.equal(postBody.success, true);
      assert.equal(postBody.status, 'success');

      // PUT
      const putRes = await client('/api/devices/GENERATOR_005', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Backup Generator Unit 1' }),
      });
      const putBody = await putRes.json();
      assert.equal(putRes.status, 200);
      assert.equal(putBody.data.name, 'Backup Generator Unit 1');

      // DELETE
      const delRes = await client('/api/devices/GENERATOR_005', {
        method: 'DELETE',
      });
      assert.equal(delRes.status, 200);
    });

    it('verifies GET /api/telemetry, /api/telemetry/:deviceId, and /device/:deviceId alias', async () => {
      // Primary route
      const res1 = await client('/api/telemetry/TURBINE_001');
      assert.equal(res1.status, 200);

      // Plural devices route
      const res2 = await client('/api/telemetry/devices/TURBINE_001');
      assert.equal(res2.status, 200);

      // Singular device alias (from API contract)
      const res3 = await client('/api/telemetry/device/TURBINE_001');
      assert.equal(res3.status, 200);
      const body3 = await res3.json();
      assert.equal(body3.success, true);
      assert.equal(body3.status, 'ok');
    });

    it('verifies GET /api/rules and GET /api/rules/alerts', async () => {
      const rulesRes = await client('/api/rules');
      const rulesBody = await rulesRes.json();
      assert.equal(rulesRes.status, 200);
      assert.equal(rulesBody.success, true);

      const alertsRes = await client('/api/rules/alerts');
      const alertsBody = await alertsRes.json();
      assert.equal(alertsRes.status, 200);
      assert.equal(alertsBody.success, true);
      assert.ok(alertsBody.stats);
    });

    it('verifies GET /api/health includes database and WebSocket stats', async () => {
      const res = await client('/api/health');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.websocket);
      assert.equal(body.websocket.path, '/ws');
      assert.equal(typeof body.websocket.connectedClients, 'number');
    });
  });
});
