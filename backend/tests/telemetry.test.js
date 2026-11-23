import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import app from '../src/app.js';
import { validateTelemetrySchema } from '../src/models/telemetry.model.js';
import { deviceService } from '../src/services/device.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('Telemetry Ingestion & Retrieval API (/api/telemetry)', () => {
  beforeEach(() => {
    deviceService.resetToDefaults();
    telemetryService.clear();
  });

  describe('Ingestion (POST /api/telemetry)', () => {
    it('successfully ingests valid telemetry event from PPT sample', async () => {
      const payload = {
        deviceId: 'TURBINE_001',
        temperature: 85,
        pressure: 42,
        timestamp: '2026-11-12T09:00:00.000Z',
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.status, 'success');
      assert.equal(body.message, 'Telemetry data ingested successfully');
      assert.equal(body.data.deviceId, 'TURBINE_001');
      assert.equal(body.data.temperature, 85);
      assert.equal(body.data.pressure, 42);
      assert.equal(body.data.metrics.temperature, 85);
      assert.equal(body.data.metrics.pressure, 42);
      assert.equal(body.data.timestamp, '2026-11-12T09:00:00.000Z');
      assert.ok(body.data.receivedAt);
      assert.ok(body.data.ingestedAt);
    });

    it('auto-generates ISO timestamp when timestamp is omitted', async () => {
      const payload = {
        deviceId: 'MOTOR_002',
        vibration: 2.1,
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'MOTOR_002');
      assert.equal(body.data.vibration, 2.1);
      assert.ok(body.data.timestamp);
      assert.equal(Number.isNaN(new Date(body.data.timestamp).getTime()), false);
    });

    it('supports POST /api/telemetry/ingest alias', async () => {
      const payload = {
        deviceId: 'BOILER_004',
        temperature: 71,
      };

      const response = await client('/api/telemetry/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'BOILER_004');
      assert.equal(body.data.temperature, 71);
    });

    it('supports nested metrics payload structure', async () => {
      const payload = {
        deviceId: 'PUMP_003',
        timestamp: '2026-11-12T10:00:00.000Z',
        metrics: {
          pressure: 45.2,
          flowRate: 120,
        },
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.data.metrics.pressure, 45.2);
      assert.equal(body.data.metrics.flowRate, 120);
      assert.equal(body.data.pressure, 45.2);
    });

    it('supports batch telemetry ingestion via array', async () => {
      const payload = [
        { deviceId: 'TURBINE_001', temperature: 84 },
        { deviceId: 'MOTOR_002', vibration: 2.3 },
      ];

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.count, 2);
      assert.equal(Array.isArray(body.data), true);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[1].deviceId, 'MOTOR_002');
    });

    it('returns 400 when body is empty object', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.status, 'fail');
      assert.match(body.message, /Request body cannot be empty/);
    });

    it('returns 400 when deviceId is missing', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 85 }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const deviceIdError = body.details.find((d) => d.field === 'deviceId');
      assert.ok(deviceIdError);
      assert.equal(deviceIdError.message, 'deviceId is required');
    });

    it('returns 400 when deviceId is empty or whitespace', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: '   ', temperature: 85 }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const error = body.details.find((d) => d.field === 'deviceId');
      assert.ok(error);
      assert.equal(error.message, 'deviceId cannot be empty');
    });

    it('returns 400 when no sensor metrics are provided', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const metricsError = body.details.find((d) => d.field === 'metrics');
      assert.ok(metricsError);
      assert.match(metricsError.message, /At least one numeric sensor metric/);
    });

    it('returns 400 when metric value is not a valid number', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 'very-hot',
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const metricError = body.details.find((d) => d.field === 'temperature');
      assert.ok(metricError);
      assert.match(metricError.message, /must be a valid number/);
    });

    it('returns 400 when timestamp format is invalid', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 85,
          timestamp: 'not-a-real-date',
        }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const tsError = body.details.find((d) => d.field === 'timestamp');
      assert.ok(tsError);
      assert.match(tsError.message, /must be a valid ISO 8601/);
    });

    it('returns 400 when batch item fails validation with indexed path', async () => {
      const payload = [
        { deviceId: 'TURBINE_001', temperature: 80 },
        { deviceId: '', temperature: 90 },
      ];

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const indexError = body.details.find((d) => d.field === '[1].deviceId');
      assert.ok(indexError);
      assert.equal(indexError.message, 'deviceId cannot be empty');
    });
  });

  describe('Retrieval & Filtering (GET /api/telemetry) [Task 6]', () => {
    beforeEach(async () => {
      // Seed telemetry readings
      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 80,
          pressure: 40,
          timestamp: '2026-11-20T10:00:00.000Z',
        }),
      });
      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'TURBINE_001',
          temperature: 85,
          pressure: 42,
          timestamp: '2026-11-20T10:05:00.000Z',
        }),
      });
      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'MOTOR_002',
          vibration: 2.1,
          timestamp: '2026-11-20T10:10:00.000Z',
        }),
      });
    });

    it('GET /api/telemetry retrieves all telemetry with pagination structure', async () => {
      const response = await client('/api/telemetry');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.equal(body.count, 3);
      assert.equal(body.pagination.total, 3);
      assert.equal(body.pagination.page, 1);
      assert.equal(body.pagination.limit, 50);
      assert.equal(body.data.length, 3);
    });

    it('device-wise filtering via query parameter: ?deviceId=TURBINE_001', async () => {
      const response = await client('/api/telemetry?deviceId=TURBINE_001');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 2);
      assert.equal(body.pagination.total, 2);
      for (const item of body.data) {
        assert.equal(item.deviceId, 'TURBINE_001');
      }
    });

    it('device-wise retrieval via route parameter: GET /api/telemetry/:deviceId', async () => {
      const response = await client('/api/telemetry/TURBINE_001');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 2);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[1].deviceId, 'TURBINE_001');
    });

    it('returns 404 Not Found for unregistered deviceId in route param', async () => {
      const response = await client('/api/telemetry/NON_EXISTENT_DEV');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /not found/i);
    });

    it('returns 404 Not Found for unregistered deviceId in query param', async () => {
      const response = await client('/api/telemetry?deviceId=NON_EXISTENT_DEV');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /not found/i);
    });

    it('returns 400 Bad Request for deviceId with invalid format (spaces or symbols)', async () => {
      const response = await client('/api/telemetry/INVALID%20DEVICE%20ID%20!');
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const error = body.details.find((d) => d.field === 'deviceId');
      assert.ok(error);
      assert.match(error.message, /can only contain alphanumeric characters/);
    });

    it('returns empty array (200 OK) for registered device with no telemetry yet (Pump 03)', async () => {
      // PUMP_003 is seeded in demo devices with no telemetry initially
      const response = await client('/api/telemetry/PUMP_003');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 0);
      assert.deepEqual(body.data, []);
    });

    it('filters telemetry by date range: startDate and endDate', async () => {
      const response = await client(
        '/api/telemetry?startDate=2026-11-20T10:04:00.000Z&endDate=2026-11-20T10:06:00.000Z'
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[0].temperature, 85);
    });

    it('filters telemetry by metric presence: ?metric=vibration', async () => {
      const response = await client('/api/telemetry?metric=vibration');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'MOTOR_002');
    });

    it('supports sorting order: ?sort=asc vs ?sort=desc', async () => {
      const resAsc = await client('/api/telemetry?deviceId=TURBINE_001&sort=asc');
      const bodyAsc = await resAsc.json();
      assert.equal(bodyAsc.data[0].temperature, 80); // oldest first

      const resDesc = await client('/api/telemetry?deviceId=TURBINE_001&sort=desc');
      const bodyDesc = await resDesc.json();
      assert.equal(bodyDesc.data[0].temperature, 85); // newest first
    });

    it('supports pagination: ?limit=1&page=2', async () => {
      const response = await client('/api/telemetry?limit=1&page=2');
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.pagination.page, 2);
      assert.equal(body.pagination.limit, 1);
      assert.equal(body.pagination.total, 3);
      assert.equal(body.pagination.totalPages, 3);
    });

    describe('Query Parameter Validations', () => {
      it('returns 400 when limit is not an integer', async () => {
        const response = await client('/api/telemetry?limit=abc');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'limit');
        assert.ok(error);
        assert.match(error.message, /must be an integer between 1 and 1000/);
      });

      it('returns 400 when limit is less than 1', async () => {
        const response = await client('/api/telemetry?limit=0');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'limit');
        assert.ok(error);
      });

      it('returns 400 when limit exceeds 1000', async () => {
        const response = await client('/api/telemetry?limit=1001');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'limit');
        assert.ok(error);
      });

      it('returns 400 when page is less than 1', async () => {
        const response = await client('/api/telemetry?page=0');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'page');
        assert.ok(error);
        assert.match(error.message, /greater than or equal to 1/);
      });

      it('returns 400 when startDate is not a valid date', async () => {
        const response = await client('/api/telemetry?startDate=not-a-date');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'startDate');
        assert.ok(error);
        assert.match(error.message, /must be a valid ISO 8601/);
      });

      it('returns 400 when endDate is not a valid date', async () => {
        const response = await client('/api/telemetry?endDate=not-a-date');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'endDate');
        assert.ok(error);
        assert.match(error.message, /must be a valid ISO 8601/);
      });

      it('returns 400 when startDate is later than endDate', async () => {
        const response = await client(
          '/api/telemetry?startDate=2026-11-25T00:00:00Z&endDate=2026-11-20T00:00:00Z'
        );
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'startDate');
        assert.ok(error);
        assert.match(error.message, /cannot be later than endDate/);
      });

      it('returns 400 when sort is neither asc nor desc', async () => {
        const response = await client('/api/telemetry?sort=sideways');
        const body = await response.json();

        assert.equal(response.status, 400);
        const error = body.details.find((d) => d.field === 'sort');
        assert.ok(error);
        assert.match(error.message, /must be either 'asc' or 'desc'/);
      });
    });

    describe('Snapshot & Statistics Endpoints', () => {
      it('GET /api/telemetry/latest returns latest snapshot for all active devices', async () => {
        const response = await client('/api/telemetry/latest');
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.success, true);
        assert.equal(body.data.length, 2);
      });

      it('GET /api/telemetry/:deviceId/latest returns latest reading for single device', async () => {
        const response = await client('/api/telemetry/TURBINE_001/latest');
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.data.deviceId, 'TURBINE_001');
        assert.equal(body.data.temperature, 85);
      });

      it('GET /api/telemetry/:deviceId/latest returns 404 for unknown device', async () => {
        const response = await client('/api/telemetry/NON_EXISTENT_DEV/latest');
        const body = await response.json();

        assert.equal(response.status, 404);
        assert.equal(body.success, false);
      });

      it('GET /api/telemetry/history maintains backward compatibility', async () => {
        const response = await client('/api/telemetry/history?limit=1');
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.count, 1);
        assert.equal(body.data.length, 1);
      });

      it('GET /api/telemetry/stats returns operational metrics', async () => {
        const response = await client('/api/telemetry/stats');
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.data.totalEventsReceived, 3);
        assert.equal(body.data.activeDevicesCount, 2);
      });
    });
  });

  describe('Telemetry Model Schema Specification', () => {
    it('validates telemetry object against Telemetry schema specification', () => {
      const valid = {
        deviceId: 'TURBINE_001',
        timestamp: new Date().toISOString(),
        metrics: { temperature: 85 },
      };
      const errors = validateTelemetrySchema(valid);
      assert.equal(errors.length, 0);

      const invalid = { deviceId: '', timestamp: 'bad' };
      const invalidErrors = validateTelemetrySchema(invalid);
      assert.ok(invalidErrors.length >= 2);
    });
  });

  describe('Expected File Resolution Checks', () => {
    it('verifies server/src/controllers/telemetryController.js exports all handlers', async () => {
      const controller = await import('../../server/src/controllers/telemetryController.js');
      assert.equal(typeof controller.getTelemetry, 'function');
      assert.equal(typeof controller.getLatestTelemetry, 'function');
      assert.equal(typeof controller.ingestTelemetry, 'function');
      assert.equal(typeof controller.getTelemetryHistory, 'function');
      assert.equal(typeof controller.getTelemetryStats, 'function');
    });

    it('verifies server/src/routes/telemetryRoutes.js exports Express router', async () => {
      const routesModule = await import('../../server/src/routes/telemetryRoutes.js');
      assert.ok(routesModule.default);
      assert.equal(typeof routesModule.default, 'function');
    });
  });
});
