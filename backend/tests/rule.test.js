import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import app from '../src/app.js';
import { validateRuleSchema } from '../src/models/rule.model.js';
import { deviceService } from '../src/services/device.service.js';
import { ruleService } from '../src/services/rule.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('NexusFlow Rules & Evaluation Engine (Task 7)', () => {
  beforeEach(() => {
    ruleService.resetToDefaults();
    telemetryService.clear();
    deviceService.resetToDefaults();
  });

  // =========================================================================
  // 1. Rule Model & Schema Spec Tests
  // =========================================================================
  describe('Rule Model Specification', () => {
    it('validates a compliant rule object with zero errors', () => {
      const validRule = {
        ruleId: 'RULE_999',
        name: 'High Pressure Shutdown',
        deviceId: 'BOILER_004',
        metric: 'pressure',
        condition: {
          operator: '>',
          threshold: 150,
        },
        action: {
          type: 'alert',
          severity: 'critical',
          message: 'Boiler pressure exceeded safe threshold',
        },
      };

      const errors = validateRuleSchema(validRule);
      assert.equal(errors.length, 0);
    });

    it('rejects rule object missing required fields', () => {
      const invalidRule = {
        name: '',
        condition: { operator: 'invalid', threshold: 'not-a-number' },
      };

      const errors = validateRuleSchema(invalidRule);
      assert.ok(errors.length >= 3);
      assert.ok(errors.some((e) => e.includes('name')));
      assert.ok(errors.some((e) => e.includes('deviceId')));
      assert.ok(errors.some((e) => e.includes('metric')));
      assert.ok(errors.some((e) => e.includes('operator')));
      assert.ok(errors.some((e) => e.includes('threshold')));
    });
  });

  // =========================================================================
  // 2. GET /api/rules (Retrieval & Filtering)
  // =========================================================================
  describe('GET /api/rules', () => {
    it('returns all active demo rules with 200 OK', async () => {
      const res = await client('/api/rules');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.ok(Array.isArray(body.data));
      assert.equal(body.count, 2);
      assert.equal(body.data[0].ruleId, 'RULE_001');
      assert.equal(body.data[1].ruleId, 'RULE_002');
    });

    it('filters rules by deviceId query parameter', async () => {
      const res = await client('/api/rules?deviceId=TURBINE_001');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].deviceId, 'TURBINE_001');
      assert.equal(body.data[0].ruleId, 'RULE_001');
    });

    it('filters rules by metric query parameter', async () => {
      const res = await client('/api/rules?metric=vibration');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].metric, 'vibration');
      assert.equal(body.data[0].ruleId, 'RULE_002');
    });

    it('filters rules by severity query parameter', async () => {
      const res = await client('/api/rules?severity=critical');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].action.severity, 'critical');
    });

    it('returns empty array when filter matches no rules', async () => {
      const res = await client('/api/rules?deviceId=NON_EXISTENT');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.count, 0);
      assert.deepEqual(body.data, []);
    });
  });

  // =========================================================================
  // 3. GET /api/rules/:id (Single Rule Lookup)
  // =========================================================================
  describe('GET /api/rules/:id', () => {
    it('returns 200 OK with rule details for existing ruleId', async () => {
      const res = await client('/api/rules/RULE_001');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.ruleId, 'RULE_001');
      assert.equal(body.data.name, 'Turbine Temperature Safety Rule');
      assert.equal(body.data.deviceId, 'TURBINE_001');
      assert.equal(body.data.metric, 'temperature');
      assert.equal(body.data.condition.operator, '>');
      assert.equal(body.data.condition.threshold, 80);
    });

    it('returns 200 OK case-insensitively for rule ID', async () => {
      const res = await client('/api/rules/rule_001');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.ruleId, 'RULE_001');
    });

    it('returns 404 Not Found for non-existent rule ID', async () => {
      const res = await client('/api/rules/RULE_999');
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.status, 'fail');
      assert.match(body.message, /Rule with ID "RULE_999" not found/i);
    });
  });

  // =========================================================================
  // 4. POST /api/rules (Creation & Validation)
  // =========================================================================
  describe('POST /api/rules', () => {
    it('creates a new rule with 201 Created and auto-generated ruleId', async () => {
      const payload = {
        name: 'Pump Pressure Upper Limit',
        description: 'Notify when Pump 03 pressure exceeds 120 PSI',
        deviceId: 'PUMP_003',
        metric: 'pressure',
        condition: {
          operator: '>=',
          threshold: 120,
        },
        action: {
          type: 'alert',
          severity: 'warning',
          message: 'Pump 03 pressure high',
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.status, 'success');
      assert.equal(body.data.name, payload.name);
      assert.equal(body.data.deviceId, 'PUMP_003');
      assert.equal(body.data.condition.threshold, 120);
      assert.equal(body.data.condition.operator, '>=');
      assert.equal(body.data.status, 'active');
      assert.equal(body.data.enabled, true);
      assert.ok(body.data.ruleId);
      assert.match(body.data.ruleId, /^RULE_\d{3}$/);
    });

    it('creates a new rule with user-provided custom ruleId', async () => {
      const payload = {
        ruleId: 'RULE_CUSTOM_01',
        name: 'Boiler Temperature Alarm',
        deviceId: 'BOILER_004',
        metric: 'temperature',
        condition: {
          operator: '>',
          threshold: 95.5,
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.data.ruleId, 'RULE_CUSTOM_01');
      assert.equal(body.data.condition.threshold, 95.5);
    });

    it('returns 409 Conflict when attempting to create a duplicate ruleId', async () => {
      const payload = {
        ruleId: 'RULE_001',
        name: 'Duplicate Rule ID',
        deviceId: 'TURBINE_001',
        metric: 'temperature',
        condition: {
          operator: '>',
          threshold: 75,
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.equal(body.status, 'fail');
      assert.match(body.message, /already exists/i);
    });

    it('returns 400 Bad Request with field details when required fields are missing', async () => {
      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {},
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.status, 'fail');
      assert.ok(Array.isArray(body.details));
      const fieldNames = body.details.map((d) => d.field);
      assert.ok(fieldNames.includes('name'));
      assert.ok(fieldNames.includes('deviceId'));
      assert.ok(fieldNames.includes('metric'));
      assert.ok(fieldNames.includes('condition'));
    });

    it('returns 400 Bad Request when operator is invalid', async () => {
      const payload = {
        name: 'Invalid Operator Rule',
        deviceId: 'TURBINE_001',
        metric: 'temperature',
        condition: {
          operator: 'INVALID_OP',
          threshold: 50,
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.details.some((d) => d.field === 'condition.operator'));
    });

    it('returns 400 Bad Request when threshold is non-numeric', async () => {
      const payload = {
        name: 'Non Numeric Threshold Rule',
        deviceId: 'TURBINE_001',
        metric: 'temperature',
        condition: {
          operator: '>',
          threshold: 'not_a_number',
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.details.some((d) => d.field === 'condition.threshold'));
    });

    it('returns 400 Bad Request when severity is invalid', async () => {
      const payload = {
        name: 'Invalid Severity Rule',
        deviceId: 'TURBINE_001',
        metric: 'temperature',
        condition: {
          operator: '>',
          threshold: 50,
        },
        action: {
          severity: 'catastrophic',
        },
      };

      const res = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.details.some((d) => d.field === 'action.severity'));
    });
  });

  // =========================================================================
  // 5. PUT /api/rules/:id (Update & Immutability)
  // =========================================================================
  describe('PUT /api/rules/:id', () => {
    it('updates rule threshold and action message with 200 OK', async () => {
      const updatePayload = {
        name: 'Turbine Temperature Safety Rule (Updated)',
        condition: {
          operator: '>=',
          threshold: 85,
        },
        action: {
          severity: 'critical',
          message: 'Turbine 01 critical temperature reached (85°C)',
        },
      };

      const res = await client('/api/rules/RULE_001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: updatePayload,
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.ruleId, 'RULE_001');
      assert.equal(body.data.name, updatePayload.name);
      assert.equal(body.data.condition.threshold, 85);
      assert.equal(body.data.condition.operator, '>=');
      assert.equal(body.data.action.message, updatePayload.action.message);
    });

    it('returns 400 Bad Request if client attempts to alter immutable ruleId', async () => {
      const res = await client('/api/rules/RULE_001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          ruleId: 'RULE_MUTATED',
        },
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.details.some((d) => d.field === 'ruleId'));
    });

    it('returns 404 Not Found when updating non-existent rule', async () => {
      const res = await client('/api/rules/RULE_NON_EXISTENT', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: { name: 'New Name' },
      });
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  // =========================================================================
  // 6. DELETE /api/rules/:id (Deletion)
  // =========================================================================
  describe('DELETE /api/rules/:id', () => {
    it('deletes an existing rule with 200 OK', async () => {
      const res = await client('/api/rules/RULE_002', {
        method: 'DELETE',
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.ruleId, 'RULE_002');

      // Verify rule no longer exists
      const verifyRes = await client('/api/rules/RULE_002');
      assert.equal(verifyRes.status, 404);
    });

    it('returns 404 Not Found when deleting non-existent rule', async () => {
      const res = await client('/api/rules/RULE_999', {
        method: 'DELETE',
      });
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
    });
  });

  // =========================================================================
  // 7. POST /api/rules/test & /api/rules/:id/test (Dry-Run Evaluation)
  // =========================================================================
  describe('POST /api/rules/test (Dry Run Evaluation)', () => {
    it('evaluates ad-hoc rule against telemetry payload and reports triggered: true', async () => {
      const payload = {
        rule: {
          deviceId: 'TURBINE_001',
          metric: 'temperature',
          condition: { operator: '>', threshold: 75 },
          action: { type: 'alert', severity: 'critical', message: 'High temp' },
        },
        telemetry: {
          deviceId: 'TURBINE_001',
          temperature: 82.5,
        },
      };

      const res = await client('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.triggered, true);
      assert.equal(body.data.value, 82.5);
      assert.equal(body.data.threshold, 75);
    });

    it('evaluates ad-hoc rule against telemetry payload and reports triggered: false when below threshold', async () => {
      const payload = {
        rule: {
          deviceId: 'TURBINE_001',
          metric: 'temperature',
          condition: { operator: '>', threshold: 75 },
        },
        telemetry: {
          deviceId: 'TURBINE_001',
          temperature: 68.0,
        },
      };

      const res = await client('/api/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.triggered, false);
    });

    it('evaluates stored rule by ID with POST /api/rules/:id/test', async () => {
      const payload = {
        telemetry: {
          deviceId: 'TURBINE_001',
          temperature: 92.4,
        },
      };

      const res = await client('/api/rules/RULE_001/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.data.triggered, true);
      assert.equal(body.data.ruleId, 'RULE_001');
      assert.equal(body.data.value, 92.4);
    });
  });

  // =========================================================================
  // 8. Integration with Telemetry APIs & Live Evaluation
  // =========================================================================
  describe('Rule Engine & Telemetry Stream Compatibility', () => {
    it('evaluates active rules on incoming POST /api/telemetry and updates lastTriggeredAt', async () => {
      // 1. Verify RULE_001 has no lastTriggeredAt
      const initialRuleRes = await client('/api/rules/RULE_001');
      const initialRule = (await initialRuleRes.json()).data;
      assert.equal(initialRule.lastTriggeredAt, null);

      // 2. Ingest telemetry that exceeds RULE_001 threshold (temperature 88.5 > 80)
      const telemetryPayload = {
        deviceId: 'TURBINE_001',
        metrics: {
          temperature: 88.5,
          rpm: 3200,
        },
      };

      const telemetryRes = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: telemetryPayload,
      });
      const telemetryBody = await telemetryRes.json();

      assert.equal(telemetryRes.status, 201);
      assert.equal(telemetryBody.success, true);

      // 3. Verify RULE_001 was triggered and updated lastTriggeredAt
      const updatedRuleRes = await client('/api/rules/RULE_001');
      const updatedRule = (await updatedRuleRes.json()).data;

      assert.ok(updatedRule.lastTriggeredAt !== null);
      assert.ok(typeof updatedRule.lastTriggeredAt === 'string');
    });

    it('does not trigger rule if telemetry value is within safe threshold', async () => {
      const telemetryPayload = {
        deviceId: 'TURBINE_001',
        metrics: {
          temperature: 65.0, // <= 80 threshold
        },
      };

      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: telemetryPayload,
      });

      const ruleRes = await client('/api/rules/RULE_001');
      const rule = (await ruleRes.json()).data;

      assert.equal(rule.lastTriggeredAt, null);
    });

    it('maintains compatibility with telemetry history retrieval after rule evaluation', async () => {
      await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          deviceId: 'MOTOR_002',
          metrics: { vibration: 2.8 },
        },
      });

      const historyRes = await client('/api/telemetry?deviceId=MOTOR_002');
      const historyBody = await historyRes.json();

      assert.equal(historyRes.status, 200);
      assert.equal(historyBody.success, true);
      assert.equal(historyBody.count, 1);
      assert.equal(historyBody.data[0].deviceId, 'MOTOR_002');
      assert.equal(historyBody.data[0].metrics.vibration, 2.8);
    });
  });

  // =========================================================================
  // 9. Expected File Resolution Checks
  // =========================================================================
  describe('Expected File Resolution Checks', () => {
    it('verifies server/src/controllers/ruleController.js exports all handlers', async () => {
      const serverController = await import('../../server/src/controllers/ruleController.js');
      assert.equal(typeof serverController.createRule, 'function');
      assert.equal(typeof serverController.getRules, 'function');
      assert.equal(typeof serverController.getRule, 'function');
      assert.equal(typeof serverController.updateRule, 'function');
      assert.equal(typeof serverController.deleteRule, 'function');
      assert.equal(typeof serverController.testRule, 'function');
    });

    it('verifies server/src/routes/ruleRoutes.js exports Express router', async () => {
      const serverRoutes = await import('../../server/src/routes/ruleRoutes.js');
      assert.equal(typeof serverRoutes.default, 'function');
    });

    it('verifies backend/src/controllers/ruleController.js alias mirror', async () => {
      const backendController = await import('../src/controllers/ruleController.js');
      assert.equal(typeof backendController.createRule, 'function');
    });

    it('verifies backend/src/routes/ruleRoutes.js alias mirror', async () => {
      const backendRoutes = await import('../src/routes/ruleRoutes.js');
      assert.equal(typeof backendRoutes.default, 'function');
    });
  });
});
