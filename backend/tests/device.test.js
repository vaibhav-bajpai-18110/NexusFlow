import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import app from '../src/app.js';
import { validateDeviceSchema } from '../src/models/device.model.js';
import { deviceService } from '../src/services/device.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('Device Registry API (/api/devices)', () => {
  beforeEach(() => {
    deviceService.resetToDefaults();
    telemetryService.clear();
  });

  describe('GET /api/devices', () => {
    it('returns default seeded demo devices', async () => {
      const response = await client('/api/devices');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.equal(body.count, 4);
      assert.equal(Array.isArray(body.data), true);

      const turbine = body.data.find((d) => d.deviceId === 'TURBINE_001');
      assert.ok(turbine);
      assert.equal(turbine.name, 'Turbine 01');
      assert.equal(turbine.type, 'Temperature');
      assert.equal(turbine.status, 'online');
      assert.equal(turbine.lastValue, 78);
    });

    it('filters devices by status=offline', async () => {
      const response = await client('/api/devices?status=offline');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'PUMP_003');
      assert.equal(body.data[0].status, 'offline');
    });

    it('filters devices by status=online', async () => {
      const response = await client('/api/devices?status=online');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 3);
      for (const dev of body.data) {
        assert.equal(dev.status, 'online');
      }
    });

    it('filters devices by type=Vibration', async () => {
      const response = await client('/api/devices?type=Vibration');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'MOTOR_002');
    });

    it('searches devices by text query', async () => {
      const response = await client('/api/devices?search=boiler');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'BOILER_004');
    });
  });

  describe('GET /api/devices/stats', () => {
    it('returns accurate device count and status statistics', async () => {
      const response = await client('/api/devices/stats');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.totalDevices, 4);
      assert.equal(body.data.devicesOnline, 3);
      assert.equal(body.data.devicesOffline, 1);
      assert.equal(body.data.byType.Temperature, 2);
      assert.equal(body.data.byType.Vibration, 1);
      assert.equal(body.data.byType.Pressure, 1);
    });
  });

  describe('GET /api/devices/:id', () => {
    it('returns specific device by deviceId (case-insensitive)', async () => {
      const response = await client('/api/devices/turbine_001');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'TURBINE_001');
      assert.equal(body.data.name, 'Turbine 01');
    });

    it('returns 404 for unknown deviceId', async () => {
      const response = await client('/api/devices/NON_EXISTENT_999');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /not found/);
    });
  });

  describe('POST /api/devices (Registration)', () => {
    it('registers a new device successfully', async () => {
      const newDevice = {
        deviceId: 'CHILLER_005',
        name: 'Chiller 05',
        type: 'Temperature',
        unit: '°C',
        location: 'HVAC Plant Room',
        description: 'Centrifugal liquid chiller unit',
      };

      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDevice),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Device registered successfully');
      assert.equal(body.data.deviceId, 'CHILLER_005');
      assert.equal(body.data.name, 'Chiller 05');
      assert.equal(body.data.status, 'offline');
      assert.ok(body.data.createdAt);
    });

    it('returns 400 when deviceId is missing', async () => {
      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Device without ID' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const error = body.details.find((d) => d.field === 'deviceId');
      assert.ok(error);
      assert.equal(error.message, 'deviceId is required');
    });

    it('returns 400 when deviceId has invalid characters', async () => {
      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'invalid ID with spaces!' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const error = body.details.find((d) => d.field === 'deviceId');
      assert.ok(error);
      assert.match(error.message, /can only contain letters, numbers/);
    });

    it('returns 400 when status is invalid', async () => {
      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'VALID_ID', status: 'destroyed' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const error = body.details.find((d) => d.field === 'status');
      assert.ok(error);
      assert.match(error.message, /must be one of: online, offline, maintenance/);
    });

    it('returns 409 Conflict when deviceId already exists', async () => {
      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', name: 'Duplicate Turbine' }),
      });

      const body = await response.json();

      assert.equal(response.status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/);
    });
  });

  describe('PUT /api/devices/:id (Update)', () => {
    it('updates device metadata successfully', async () => {
      const response = await client('/api/devices/TURBINE_001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Turbine 01 Primary',
          location: 'Main Turbine Floor Level 2',
          status: 'maintenance',
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Turbine 01 Primary');
      assert.equal(body.data.location, 'Main Turbine Floor Level 2');
      assert.equal(body.data.status, 'maintenance');
    });

    it('returns 400 when trying to modify immutable deviceId', async () => {
      const response = await client('/api/devices/TURBINE_001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'NEW_TURBINE_ID' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Validation failed/);
    });

    it('returns 404 when updating non-existent device', async () => {
      const response = await client('/api/devices/DOES_NOT_EXIST', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });

      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
    });
  });

  describe('DELETE /api/devices/:id', () => {
    it('deletes device and prevents subsequent lookups', async () => {
      const delResponse = await client('/api/devices/MOTOR_002', {
        method: 'DELETE',
      });
      const delBody = await delResponse.json();

      assert.equal(delResponse.status, 200);
      assert.equal(delBody.success, true);
      assert.match(delBody.message, /deleted successfully/);

      const getResponse = await client('/api/devices/MOTOR_002');
      assert.equal(getResponse.status, 404);
    });

    it('returns 404 when deleting non-existent device', async () => {
      const response = await client('/api/devices/DOES_NOT_EXIST', {
        method: 'DELETE',
      });
      assert.equal(response.status, 404);
    });
  });

  describe('Telemetry-to-Device Live Integration', () => {
    it('transitions offline device to online and updates lastValue when telemetry arrives', async () => {
      // 1. Verify PUMP_003 is offline initially
      const initialGet = await client('/api/devices/PUMP_003');
      const initialBody = await initialGet.json();
      assert.equal(initialBody.data.status, 'offline');
      assert.equal(initialBody.data.lastValue, null);

      // 2. Ingest telemetry for PUMP_003
      const telemetryResponse = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'PUMP_003',
          pressure: 45.8,
        }),
      });
      assert.equal(telemetryResponse.status, 201);

      // 3. Verify device status transitioned to online with updated lastValue
      const updatedGet = await client('/api/devices/PUMP_003');
      const updatedBody = await updatedGet.json();

      assert.equal(updatedBody.data.status, 'online');
      assert.equal(updatedBody.data.lastValue, 45.8);
      assert.ok(updatedBody.data.lastSeen);
    });

    it('auto-discovers and registers a brand new device on telemetry ingestion', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'ROBOT_ARM_10',
          vibration: 1.45,
        }),
      });
      assert.equal(response.status, 201);

      // Check device registry
      const devResponse = await client('/api/devices/ROBOT_ARM_10');
      const devBody = await devResponse.json();

      assert.equal(devResponse.status, 200);
      assert.equal(devBody.data.deviceId, 'ROBOT_ARM_10');
      assert.equal(devBody.data.status, 'online');
      assert.equal(devBody.data.lastValue, 1.45);
    });
  });

  describe('Device Model Schema Verification', () => {
    it('validates device object against Device schema specification', () => {
      const valid = { deviceId: 'TURBINE_001', name: 'Turbine 01', status: 'online' };
      const errors = validateDeviceSchema(valid);
      assert.equal(errors.length, 0);

      const invalid = { deviceId: '', status: 'unknown' };
      const invalidErrors = validateDeviceSchema(invalid);
      assert.ok(invalidErrors.length >= 2);
    });
  });

  // =========================================================================
  // Task 9: Frontend API Contract & Registration Verification
  // =========================================================================
  describe('Frontend API Contract & Registration Verification (Task 9)', () => {
    it('registers a device using exact frontend DeviceRegistrationForm contract payload { name, deviceId, type }', async () => {
      const frontendPayload = {
        name: 'Turbine 05',
        deviceId: 'TURBINE_005',
        type: 'Temperature',
      };

      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(frontendPayload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.status, 'success');
      assert.equal(body.message, 'Device registered successfully');
      assert.ok(body.data && typeof body.data === 'object');

      // Verify both deviceId and id alias are present for frontend deviceIdOf(device)
      assert.equal(body.data.deviceId, 'TURBINE_005');
      assert.equal(body.data.id, 'TURBINE_005');
      assert.equal(body.data.name, 'Turbine 05');
      assert.equal(body.data.type, 'Temperature');
      // Verify unit was smartly inferred from type
      assert.equal(body.data.unit, '°C');
      assert.equal(body.data.status, 'offline');
      assert.equal(body.data.lastValue, null);
      assert.ok(body.data.createdAt);
      assert.ok(body.data.updatedAt);
    });

    it('accepts { name, id, type } payload where id is provided instead of deviceId', async () => {
      const payloadWithId = {
        name: 'Pressure Sensor 08',
        id: 'PRESSURE_008',
        type: 'Pressure',
      };

      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithId),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'PRESSURE_008');
      assert.equal(body.data.id, 'PRESSURE_008');
      assert.equal(body.data.unit, 'bar');
    });

    it('returns consistent data structure for GET /api/devices matching frontend fetchDevices contract', async () => {
      const response = await client('/api/devices');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.ok(Array.isArray(body.data), 'body.data must be an array for fetchDevices()');

      // Verify all items in list have required fields consumed by frontend DeviceList
      for (const device of body.data) {
        assert.ok(device.deviceId, 'Every device must have deviceId');
        assert.equal(device.id, device.deviceId, 'device.id must match device.deviceId');
        assert.ok(device.name, 'Every device must have name');
        assert.ok(device.type, 'Every device must have type');
        assert.ok(device.status, 'Every device must have status');
        assert.ok('lastValue' in device, 'Every device must have lastValue property');
        assert.ok('unit' in device, 'Every device must have unit property');
      }
    });

    it('returns consistent data record for GET /api/devices/:id matching frontend fetchDevice contract', async () => {
      const response = await client('/api/devices/TURBINE_001');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.ok(body.data && typeof body.data === 'object');
      assert.equal(body.data.deviceId, 'TURBINE_001');
      assert.equal(body.data.id, 'TURBINE_001');
      assert.equal(body.data.name, 'Turbine 01');
      assert.equal(body.data.type, 'Temperature');
      assert.equal(body.data.unit, '°C');
    });

    it('returns clear structured validation errors matching frontend formatApiError', async () => {
      const response = await client('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'X', // too short (< 2)
          status: 'invalid_status',
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.status, 'fail');
      assert.equal(body.message, 'Validation failed for device registration');
      assert.ok(Array.isArray(body.details));

      const deviceIdError = body.details.find((d) => d.field === 'deviceId');
      assert.ok(deviceIdError);
      assert.match(deviceIdError.message, /between 2 and 50 characters/);

      const statusError = body.details.find((d) => d.field === 'status');
      assert.ok(statusError);
      assert.match(statusError.message, /must be one of: online, offline, maintenance/);
    });

    it('verifies device controller and route mirror resolution', async () => {
      const serverController = await import('../../server/src/controllers/deviceController.js');
      assert.equal(typeof serverController.getDevices, 'function');
      assert.equal(typeof serverController.createDevice, 'function');

      const serverRoutes = await import('../../server/src/routes/deviceRoutes.js');
      assert.equal(typeof serverRoutes.default, 'function');

      const backendController = await import('../src/controllers/deviceController.js');
      assert.equal(typeof backendController.createDevice, 'function');

      const backendRoutes = await import('../src/routes/deviceRoutes.js');
      assert.equal(typeof backendRoutes.default, 'function');
    });
  });
});
