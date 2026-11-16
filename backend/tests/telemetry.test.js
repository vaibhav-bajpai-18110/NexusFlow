import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');
const { telemetryService } = await import('../src/services/telemetry.service.js');

let server;
let baseUrl;

describe('Telemetry Ingestion API (POST /api/telemetry)', () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    telemetryService.clear();
  });

  it('successfully ingests valid telemetry event from PPT sample', async () => {
    const payload = {
      deviceId: 'TURBINE_001',
      temperature: 85,
      pressure: 42,
      timestamp: '2026-11-12T09:00:00.000Z',
    };

    const response = await fetch(`${baseUrl}/api/telemetry`, {
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

    const response = await fetch(`${baseUrl}/api/telemetry`, {
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

    const response = await fetch(`${baseUrl}/api/telemetry/ingest`, {
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

    const response = await fetch(`${baseUrl}/api/telemetry`, {
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

    const response = await fetch(`${baseUrl}/api/telemetry`, {
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

  describe('Validation & Error Handling', () => {
    it('returns 400 when body is empty object', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
      const response = await fetch(`${baseUrl}/api/telemetry`, {
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
        { deviceId: '', temperature: 90 }, // failing item
      ];

      const response = await fetch(`${baseUrl}/api/telemetry`, {
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

  describe('Query Endpoints (GET /api/telemetry)', () => {
    beforeEach(async () => {
      await fetch(`${baseUrl}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', temperature: 85 }),
      });
      await fetch(`${baseUrl}/api/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'MOTOR_002', vibration: 2.1 }),
      });
    });

    it('GET /api/telemetry/latest returns all latest devices', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry/latest`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.length, 2);
    });

    it('GET /api/telemetry/:deviceId returns latest data for specific device', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry/TURBINE_001`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'TURBINE_001');
      assert.equal(body.data.temperature, 85);
      assert.equal(body.data.status, 'online');
    });

    it('GET /api/telemetry/:deviceId returns 404 for unknown device', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry/UNKNOWN_DEVICE`);
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /No telemetry found for device/);
    });

    it('GET /api/telemetry/history returns recent history and supports limit', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry/history?limit=1`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'MOTOR_002');
    });

    it('GET /api/telemetry/stats returns accurate statistics', async () => {
      const response = await fetch(`${baseUrl}/api/telemetry/stats`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.data.totalEventsReceived, 2);
      assert.equal(body.data.activeDevicesCount, 2);
    });
  });
});
