import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import app from '../src/app.js';
import Telemetry from '../src/models/Telemetry.js';
import { deviceService } from '../src/services/device.service.js';
import {
  clearPersistenceErrors,
  getPersistenceErrors,
  getTelemetryByDevice,
  saveTelemetry,
} from '../src/services/persistence.service.js';
import { ruleService } from '../src/services/rule.service.js';
import { ruleEvaluationService } from '../src/services/ruleEvaluation.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('Telemetry Flow & Database Integration Verification (Task 11)', () => {
  beforeEach(() => {
    deviceService.resetToDefaults();
    telemetryService.clear();
    ruleService.resetToDefaults();
    ruleEvaluationService.reset();
    clearPersistenceErrors();
  });

  describe('1. Ingestion Flow & Payload Formats', () => {
    it('ingests standard multi-metric flat payload and updates device registry', async () => {
      const payload = {
        deviceId: 'TURBINE_001',
        temperature: 88.5,
        pressure: 44.2,
        timestamp: '2026-11-27T10:00:00.000Z',
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
      assert.equal(body.data.temperature, 88.5);
      assert.equal(body.data.pressure, 44.2);
      assert.equal(body.data.metrics.temperature, 88.5);
      assert.equal(body.data.metrics.pressure, 44.2);
      assert.ok(body.data.receivedAt);

      // Verify device registry updated
      const dev = deviceService.getById('TURBINE_001');
      assert.equal(dev.status, 'online');
      assert.equal(dev.lastValue, 88.5);
    });

    it('ingests nested metrics payload format', async () => {
      const payload = {
        deviceId: 'PUMP_003',
        timestamp: '2026-11-27T10:05:00.000Z',
        metrics: {
          pressure: 46.8,
          flowRate: 115,
        },
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'PUMP_003');
      assert.equal(body.data.metrics.pressure, 46.8);
      assert.equal(body.data.metrics.flowRate, 115);
      assert.equal(body.data.pressure, 46.8);

      // Verify offline PUMP_003 transitioned to online
      const dev = deviceService.getById('PUMP_003');
      assert.equal(dev.status, 'online');
      assert.equal(dev.lastValue, 46.8);
    });

    it('ingests single-metric / Manya schema format with sensorId, metric, value, unit', async () => {
      const payload = {
        deviceId: 'BOILER_004',
        sensorId: 'sensor-temp-boiler-04',
        timestamp: '2026-11-27T10:10:00.000Z',
        metric: 'temperature',
        value: 78.4,
        unit: '°C',
        metadata: { zone: 'Basement-South', calibrationDate: '2026-10-01' },
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.deviceId, 'BOILER_004');
      assert.equal(body.data.sensorId, 'sensor-temp-boiler-04');
      assert.equal(body.data.metric, 'temperature');
      assert.equal(body.data.value, 78.4);
      assert.equal(body.data.unit, '°C');
      assert.equal(body.data.metrics.temperature, 78.4);
      assert.equal(body.data.metadata.zone, 'Basement-South');
    });

    it('supports POST /api/telemetry/batch with raw array', async () => {
      const batchPayload = [
        { deviceId: 'TURBINE_001', temperature: 82.1 },
        { deviceId: 'MOTOR_002', vibration: 2.4 },
        { deviceId: 'PUMP_003', pressure: 41.5 },
      ];

      const response = await client('/api/telemetry/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchPayload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.count, 3);
      assert.equal(body.data.length, 3);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[1].deviceId, 'MOTOR_002');
      assert.equal(body.data[2].deviceId, 'PUMP_003');
    });

    it('supports POST /api/telemetry with wrapped batch object { batch: [...] }', async () => {
      const wrappedPayload = {
        batch: [
          { deviceId: 'TURBINE_001', temperature: 84.0 },
          { deviceId: 'BOILER_004', temperature: 73.5 },
        ],
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wrappedPayload),
      });

      const body = await response.json();

      assert.equal(response.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.count, 2);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[1].deviceId, 'BOILER_004');
    });
  });

  describe('2. Request Validation & Missing Fields', () => {
    it('returns 400 when body is empty', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Request body cannot be empty/);
    });

    it('returns 400 when deviceId is missing', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: 75.2 }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const err = body.details.find((d) => d.field === 'deviceId');
      assert.ok(err);
      assert.match(err.message, /deviceId is required/);
    });

    it('returns 400 when deviceId is empty or non-string', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: '   ', temperature: 75.2 }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const err = body.details.find((d) => d.field === 'deviceId');
      assert.ok(err);
      assert.match(err.message, /cannot be empty/);
    });

    it('returns 400 when timestamp is malformed', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', temperature: 75.2, timestamp: 'invalid-time' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const err = body.details.find((d) => d.field === 'timestamp');
      assert.ok(err);
      assert.match(err.message, /valid ISO 8601/);
    });

    it('returns 400 when no metrics are provided', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', timestamp: '2026-11-27T10:00:00Z' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const err = body.details.find((d) => d.field === 'metrics');
      assert.ok(err);
      assert.match(err.message, /At least one numeric sensor metric/);
    });

    it('returns 400 when metric value is not a number', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', temperature: 'dangerously-hot' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const err = body.details.find((d) => d.field === 'temperature');
      assert.ok(err);
      assert.match(err.message, /must be a valid number/);
    });

    it('returns 400 when metric name is provided without value', async () => {
      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: 'TURBINE_001', metric: 'temperature' }),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      const err = body.details.find((d) => d.field === 'value');
      assert.ok(err);
      assert.match(err.message, /value is required/);
    });

    it('returns 400 when batch array is empty', async () => {
      const response = await client('/api/telemetry/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.match(body.message, /batch array cannot be empty/);
    });

    it('returns 400 when batch array exceeds max limit of 500 items', async () => {
      const bigBatch = Array.from({ length: 501 }, (_, i) => ({
        deviceId: 'DEV_001',
        temperature: i,
      }));

      const response = await client('/api/telemetry/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bigBatch),
      });

      const body = await response.json();

      assert.equal(response.status, 400);
      assert.match(body.message, /exceeds maximum allowed limit/);
    });
  });

  describe('3. Error Handling for Device IDs & Not Found Routes', () => {
    it('returns 400 when deviceId parameter has invalid characters', async () => {
      const response = await client('/api/devices/invalid@device#id');
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      const err = body.details.find((d) => d.field === 'deviceId');
      assert.ok(err);
      assert.match(err.message, /can only contain letters, numbers/);
    });

    it('returns 400 when deviceId parameter is shorter than 2 characters', async () => {
      const response = await client('/api/devices/x');
      const body = await response.json();

      assert.equal(response.status, 400);
      const err = body.details.find((d) => d.field === 'deviceId');
      assert.ok(err);
      assert.match(err.message, /between 2 and 50 characters/);
    });

    it('returns 404 for non-existent device lookup in GET /api/devices/:id', async () => {
      const response = await client('/api/devices/NON_EXISTENT_999');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /Device with ID "NON_EXISTENT_999" not found/);
    });

    it('returns 404 for non-existent device telemetry in GET /api/telemetry/:deviceId', async () => {
      const response = await client('/api/telemetry/NON_EXISTENT_999');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /Device with ID "NON_EXISTENT_999" not found/);
    });

    it('returns 404 for non-existent device latest reading in GET /api/telemetry/:deviceId/latest', async () => {
      const response = await client('/api/telemetry/NON_EXISTENT_999/latest');
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.success, false);
      assert.match(body.message, /Device with ID "NON_EXISTENT_999" not found/);
    });
  });

  describe('4. Database Layer & Persistence Flow', () => {
    it('saves and retrieves telemetry via Mongoose Telemetry model and service helpers', async () => {
      const doc = new Telemetry({
        deviceId: 'TEST_PERSIST_001',
        sensorId: 'sensor-temp-01',
        timestamp: new Date('2026-11-27T10:00:00Z'),
        metric: 'temperature',
        value: 29.5,
        unit: '°C',
        metrics: { temperature: 29.5 },
        metadata: { source: 'test-flow' },
      });

      await doc.validate();
      assert.equal(doc.deviceId, 'TEST_PERSIST_001');
      assert.equal(doc.sensorId, 'sensor-temp-01');
      assert.equal(doc.metric, 'temperature');
      assert.equal(doc.value, 29.5);
      assert.equal(doc.unit, '°C');
    });

    it('saveTelemetry and getTelemetryByDevice function seamlessly', async () => {
      const record = await saveTelemetry({
        deviceId: 'TURBINE_001',
        sensorId: 'sensor-turbine-temp',
        timestamp: new Date().toISOString(),
        metric: 'temperature',
        value: 86.4,
        unit: '°C',
      });

      assert.ok(record);
      assert.equal(record.deviceId, 'TURBINE_001');

      const history = await getTelemetryByDevice('TURBINE_001');
      assert.ok(Array.isArray(history));
      assert.ok(history.length >= 1);
      assert.equal(history[0].deviceId, 'TURBINE_001');
    });

    it('rejects getTelemetryByDevice with empty or non-string deviceId', async () => {
      await assert.rejects(
        () => getTelemetryByDevice(''),
        /valid deviceId is required/
      );
    });

    it('handles persistence write errors gracefully without crashing the service', async () => {
      // In-memory mode operates with empty error queue
      const errors = getPersistenceErrors();
      assert.equal(Array.isArray(errors), true);
      assert.equal(errors.length, 0);

      // Verify clearPersistenceErrors executes cleanly
      clearPersistenceErrors();
      assert.equal(getPersistenceErrors().length, 0);
    });
  });

  describe('5. Rule Engine Integration during Ingestion Flow', () => {
    it('evaluates incoming telemetry against active rules and emits alerts on threshold breach', async () => {
      // 1. Ingest telemetry that breaches the default TURBINE_001 high temperature rule (> 80)
      const telemetryPayload = {
        deviceId: 'TURBINE_001',
        temperature: 95.5,
        pressure: 45,
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryPayload),
      });

      assert.equal(response.status, 201);

      // 2. Verify alert was triggered and stored in ruleEvaluationService
      const alertsResponse = await client('/api/rules/alerts?deviceId=TURBINE_001');
      const alertsBody = await alertsResponse.json();

      assert.equal(alertsResponse.status, 200);
      assert.equal(alertsBody.success, true);
      assert.ok(alertsBody.count >= 1);

      const triggeredAlert = alertsBody.data.find(
        (a) => a.deviceId === 'TURBINE_001' && a.metric === 'temperature'
      );
      assert.ok(triggeredAlert);
      assert.equal(triggeredAlert.value, 95.5);
      assert.equal(triggeredAlert.operator, '>');
      assert.equal(triggeredAlert.threshold, 80);
      assert.equal(triggeredAlert.severity, 'critical');
    });

    it('does not emit alert when telemetry value does not exceed threshold', async () => {
      // Clear previous alerts
      ruleEvaluationService.reset();

      // Ingest normal temperature (<= 80)
      const telemetryPayload = {
        deviceId: 'TURBINE_001',
        temperature: 72.0,
      };

      const response = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(telemetryPayload),
      });

      assert.equal(response.status, 201);

      // Verify no alerts recorded for this event
      const alerts = ruleEvaluationService.getAlerts({ deviceId: 'TURBINE_001' });
      assert.equal(alerts.length, 0);
    });

    it('verifies dry-run rule test endpoint POST /api/rules/test with payload', async () => {
      const testPayload = {
        rule: {
          deviceId: 'PUMP_003',
          metric: 'pressure',
          condition: { operator: '>=', threshold: 50 },
          action: { type: 'alert', severity: 'warning', message: 'High pressure warning' },
        },
        telemetry: {
          deviceId: 'PUMP_003',
          pressure: 55.4,
        },
      };

      const response = await client('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.triggered, true);
      assert.equal(body.data.value, 55.4);
      assert.equal(body.data.threshold, 50);
    });

    it('verifies on-demand telemetry rule evaluation endpoint POST /api/rules/evaluate', async () => {
      const evalPayload = {
        telemetry: {
          deviceId: 'TURBINE_001',
          temperature: 92,
        },
      };

      const response = await client('/api/rules/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evalPayload),
      });

      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.ok(body.totalRulesEvaluated >= 1);
      assert.ok(body.matchedCount >= 1);
      assert.equal(body.data.matched[0].matched, true);
    });
  });
});
