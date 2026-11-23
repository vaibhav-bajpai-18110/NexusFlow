import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { firstValueFrom, take, toArray } from 'rxjs';
import app from '../src/app.js';
import { deviceService } from '../src/services/device.service.js';
import { ruleService } from '../src/services/rule.service.js';
import {
  ruleEvaluationService,
  RuleEvaluationService,
} from '../src/services/ruleEvaluation.service.js';
import { telemetryService } from '../src/services/telemetry.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('RxJS Rule Evaluation Service (Task 8)', () => {
  beforeEach(() => {
    ruleService.resetToDefaults();
    telemetryService.clear();
    deviceService.resetToDefaults();
    ruleEvaluationService.clearAlerts();
  });

  // =========================================================================
  // 1. Condition Evaluator Unit Tests (>, >=, <, <=, ==, !=)
  // =========================================================================
  describe('Condition Evaluator (evaluateCondition)', () => {
    const service = ruleEvaluationService;

    describe('Greater than conditions (> and >=)', () => {
      it('returns true when value is strictly greater than threshold (>)', () => {
        assert.equal(service.evaluateCondition(85, '>', 80), true);
        assert.equal(service.evaluateCondition(80.001, '>', 80), true);
      });

      it('returns false when value is equal or less than threshold (>) [non-matching]', () => {
        assert.equal(service.evaluateCondition(80, '>', 80), false);
        assert.equal(service.evaluateCondition(75, '>', 80), false);
        assert.equal(service.evaluateCondition(-5, '>', 0), false);
      });

      it('returns true when value is greater than or equal to threshold (>=)', () => {
        assert.equal(service.evaluateCondition(85, '>=', 80), true);
        assert.equal(service.evaluateCondition(80, '>=', 80), true);
      });

      it('returns false when value is strictly less than threshold (>=) [non-matching]', () => {
        assert.equal(service.evaluateCondition(79.99, '>=', 80), false);
        assert.equal(service.evaluateCondition(-1, '>=', 0), false);
      });
    });

    describe('Less than conditions (< and <=)', () => {
      it('returns true when value is strictly less than threshold (<)', () => {
        assert.equal(service.evaluateCondition(15, '<', 20), true);
        assert.equal(service.evaluateCondition(-10, '<', 0), true);
      });

      it('returns false when value is equal or greater than threshold (<) [non-matching]', () => {
        assert.equal(service.evaluateCondition(20, '<', 20), false);
        assert.equal(service.evaluateCondition(25, '<', 20), false);
      });

      it('returns true when value is less than or equal to threshold (<=)', () => {
        assert.equal(service.evaluateCondition(15, '<=', 20), true);
        assert.equal(service.evaluateCondition(20, '<=', 20), true);
      });

      it('returns false when value is strictly greater than threshold (<=) [non-matching]', () => {
        assert.equal(service.evaluateCondition(20.01, '<=', 20), false);
        assert.equal(service.evaluateCondition(100, '<=', 50), false);
      });
    });

    describe('Equality and inequality conditions (==, !=)', () => {
      it('returns true when value equals threshold (==, ===)', () => {
        assert.equal(service.evaluateCondition(100, '==', 100), true);
        assert.equal(service.evaluateCondition(0, '===', 0), true);
        assert.equal(service.evaluateCondition(42.5, '==', 42.5), true);
      });

      it('returns false when value does not equal threshold (==) [non-matching]', () => {
        assert.equal(service.evaluateCondition(99, '==', 100), false);
        assert.equal(service.evaluateCondition(100.1, '==', 100), false);
      });

      it('returns true when value does not equal threshold (!=, !==)', () => {
        assert.equal(service.evaluateCondition(50, '!=', 0), true);
        assert.equal(service.evaluateCondition(10, '!==', 20), true);
      });

      it('returns false when value equals threshold (!=) [non-matching]', () => {
        assert.equal(service.evaluateCondition(50, '!=', 50), false);
      });
    });

    describe('Edge cases and invalid inputs', () => {
      it('returns false for non-numeric value or NaN', () => {
        assert.equal(service.evaluateCondition(NaN, '>', 50), false);
        assert.equal(service.evaluateCondition('85', '>', 50), false);
        assert.equal(service.evaluateCondition(null, '>', 50), false);
        assert.equal(service.evaluateCondition(undefined, '>', 50), false);
      });

      it('returns false for non-numeric threshold', () => {
        assert.equal(service.evaluateCondition(50, '>', NaN), false);
        assert.equal(service.evaluateCondition(50, '>', '50'), false);
        assert.equal(service.evaluateCondition(50, '>', null), false);
      });

      it('returns false for unknown operator', () => {
        assert.equal(service.evaluateCondition(50, 'UNKNOWN', 50), false);
        assert.equal(service.evaluateCondition(50, '', 50), false);
        assert.equal(service.evaluateCondition(50, null, 50), false);
      });
    });
  });

  // =========================================================================
  // 2. Single Rule Evaluation (evaluateRule)
  // =========================================================================
  describe('evaluateRule (Matching and Non-Matching Conditions)', () => {
    const service = ruleEvaluationService;

    const sampleRule = {
      ruleId: 'RULE_001',
      name: 'Turbine Temperature Safety Rule',
      deviceId: 'TURBINE_001',
      metric: 'temperature',
      condition: {
        operator: '>',
        threshold: 80,
      },
      action: {
        type: 'alert',
        severity: 'critical',
        message: 'Turbine temperature exceeded safe threshold',
      },
    };

    it('evaluates matching condition: returns matched=true, triggered=true with action', () => {
      const telemetry = {
        deviceId: 'TURBINE_001',
        temperature: 88.5,
        timestamp: '2026-11-22T10:00:00.000Z',
      };

      const result = service.evaluateRule(sampleRule, telemetry);

      assert.equal(result.matched, true);
      assert.equal(result.triggered, true);
      assert.equal(result.ruleId, 'RULE_001');
      assert.equal(result.deviceId, 'TURBINE_001');
      assert.equal(result.metric, 'temperature');
      assert.equal(result.value, 88.5);
      assert.equal(result.threshold, 80);
      assert.equal(result.operator, '>');
      assert.deepEqual(result.action, sampleRule.action);
      assert.match(result.reason, /Condition matched/);
    });

    it('evaluates non-matching condition: returns matched=false, triggered=false, action=null', () => {
      const telemetry = {
        deviceId: 'TURBINE_001',
        temperature: 72.0,
        timestamp: '2026-11-22T10:00:00.000Z',
      };

      const result = service.evaluateRule(sampleRule, telemetry);

      assert.equal(result.matched, false);
      assert.equal(result.triggered, false);
      assert.equal(result.action, null);
      assert.equal(result.value, 72.0);
      assert.match(result.reason, /Condition not matched/);
    });

    it('reads metric value from telemetry.metrics nested object', () => {
      const telemetry = {
        deviceId: 'TURBINE_001',
        metrics: {
          temperature: 92.0,
          rpm: 3400,
        },
      };

      const result = service.evaluateRule(sampleRule, telemetry);
      assert.equal(result.matched, true);
      assert.equal(result.value, 92.0);
    });

    it('rejects evaluation when deviceId does not match rule target', () => {
      const telemetry = {
        deviceId: 'OTHER_DEVICE',
        temperature: 95.0,
      };

      const result = service.evaluateRule(sampleRule, telemetry);
      assert.equal(result.matched, false);
      assert.match(result.reason, /Device mismatch/);
    });

    it('evaluates wildcard rule (deviceId: "*") against any incoming device', () => {
      const wildcardRule = {
        ruleId: 'RULE_GLOBAL',
        name: 'Universal Vibration Alert',
        deviceId: '*',
        metric: 'vibration',
        condition: { operator: '>=', threshold: 5.0 },
        action: { type: 'alert', severity: 'critical' },
      };

      const telemetryA = { deviceId: 'PUMP_003', vibration: 6.2 };
      const telemetryB = { deviceId: 'BOILER_004', vibration: 2.1 };

      const resA = service.evaluateRule(wildcardRule, telemetryA);
      const resB = service.evaluateRule(wildcardRule, telemetryB);

      assert.equal(resA.matched, true);
      assert.equal(resB.matched, false);
    });

    it('handles missing metric gracefully with non-matched result', () => {
      const telemetry = {
        deviceId: 'TURBINE_001',
        pressure: 45, // missing temperature
      };

      const result = service.evaluateRule(sampleRule, telemetry);
      assert.equal(result.matched, false);
      assert.match(result.reason, /missing or non-numeric/);
    });
  });

  // =========================================================================
  // 3. RxJS Reactive Stream Pipeline (telemetry$, evaluations$, alerts$)
  // =========================================================================
  describe('RxJS Reactive Stream Pipeline', () => {
    it('emits on alerts$ stream when incoming telemetry matches a saved rule', async () => {
      const service = new RuleEvaluationService();

      const matchingTelemetry = {
        deviceId: 'TURBINE_001',
        temperature: 88.0, // > 80 (matches RULE_001)
      };

      // Set up RxJS promise for next alert
      const alertPromise = firstValueFrom(service.alerts$);

      // Process telemetry into the RxJS Subject stream
      service.processTelemetry(matchingTelemetry);

      const alert = await alertPromise;
      assert.ok(alert);
      assert.equal(alert.matched, true);
      assert.equal(alert.ruleId, 'RULE_001');
      assert.equal(alert.deviceId, 'TURBINE_001');
      assert.equal(alert.value, 88.0);
    });

    it('does NOT emit on alerts$ stream when condition does not match', async () => {
      const service = new RuleEvaluationService();

      let alertEmitted = false;
      const sub = service.alerts$.subscribe(() => {
        alertEmitted = true;
      });

      // Non-matching telemetry (temperature 65 <= 80)
      service.processTelemetry({
        deviceId: 'TURBINE_001',
        temperature: 65.0,
      });

      // Allow event loop ticks
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(alertEmitted, false);
      sub.unsubscribe();
    });

    it('publishes both matched and non-matched evaluations to evaluations$ stream', async () => {
      const service = new RuleEvaluationService();

      const receivedEvaluations = [];
      const sub = service.evaluations$.subscribe((evalRes) => {
        receivedEvaluations.push(evalRes);
      });

      // Send telemetry for TURBINE_001 (triggers evaluation against RULE_001)
      service.processTelemetry({
        deviceId: 'TURBINE_001',
        temperature: 70.0, // non-matching
      });

      // Send telemetry for MOTOR_002 (triggers evaluation against RULE_002: vibration > 2.0)
      service.processTelemetry({
        deviceId: 'MOTOR_002',
        vibration: 3.5, // matching
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.equal(receivedEvaluations.length, 2);
      assert.equal(receivedEvaluations[0].matched, false);
      assert.equal(receivedEvaluations[0].ruleId, 'RULE_001');
      assert.equal(receivedEvaluations[1].matched, true);
      assert.equal(receivedEvaluations[1].ruleId, 'RULE_002');

      sub.unsubscribe();
    });
  });

  // =========================================================================
  // 4. Alerts History Buffer & Statistics
  // =========================================================================
  describe('Alerts Ring Buffer & Querying', () => {
    it('records matched alerts in internal history buffer and allows filtering', () => {
      const service = ruleEvaluationService;

      // Ingest 2 matching telemetry events
      service.processTelemetry({
        deviceId: 'TURBINE_001',
        temperature: 85.0,
      });
      service.processTelemetry({
        deviceId: 'MOTOR_002',
        vibration: 2.5,
      });

      const allAlerts = service.getAlerts();
      assert.equal(allAlerts.length, 2);

      // Filter by deviceId
      const turbineAlerts = service.getAlerts({ deviceId: 'TURBINE_001' });
      assert.equal(turbineAlerts.length, 1);
      assert.equal(turbineAlerts[0].ruleId, 'RULE_001');

      // Filter by severity
      const criticalAlerts = service.getAlerts({ severity: 'critical' });
      assert.equal(criticalAlerts.length, 1);
      assert.equal(criticalAlerts[0].action.severity, 'critical');

      // Test stats
      const stats = service.getStats();
      assert.equal(stats.totalMatches, 2);
      assert.equal(stats.alertsInBuffer, 2);
    });

    it('clearAlerts resets buffer and statistics', () => {
      const service = ruleEvaluationService;

      service.processTelemetry({ deviceId: 'TURBINE_001', temperature: 90 });
      assert.equal(service.getAlerts().length, 1);

      service.clearAlerts();
      assert.equal(service.getAlerts().length, 0);
      assert.equal(service.getStats().totalMatches, 0);
    });
  });

  // =========================================================================
  // 5. Backend Flow Integration (POST /api/telemetry -> Rule Evaluation)
  // =========================================================================
  describe('Backend Flow Integration', () => {
    it('POST /api/telemetry triggers rule evaluation and updates rule lastTriggeredAt', async () => {
      // 1. Initial state: RULE_001 has null lastTriggeredAt
      const ruleBefore = (await (await client('/api/rules/RULE_001')).json()).data;
      assert.equal(ruleBefore.lastTriggeredAt, null);

      // 2. Ingest matching telemetry event (temperature 86.4 > 80)
      const telemetryRes = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          deviceId: 'TURBINE_001',
          metrics: { temperature: 86.4 },
        },
      });
      assert.equal(telemetryRes.status, 201);

      // 3. Rule should now have updated lastTriggeredAt
      const ruleAfter = (await (await client('/api/rules/RULE_001')).json()).data;
      assert.ok(ruleAfter.lastTriggeredAt !== null);

      // 4. Rule alert should appear in GET /api/rules/alerts
      const alertsRes = await client('/api/rules/alerts');
      const alertsBody = await alertsRes.json();

      assert.equal(alertsRes.status, 200);
      assert.equal(alertsBody.success, true);
      assert.ok(alertsBody.count >= 1);
      assert.equal(alertsBody.data[0].ruleId, 'RULE_001');
      assert.equal(alertsBody.data[0].matched, true);
    });

    it('POST /api/telemetry with non-matching conditions does not update rule lastTriggeredAt', async () => {
      // Ingest non-matching telemetry (temperature 65 <= 80)
      const telemetryRes = await client('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          deviceId: 'TURBINE_001',
          metrics: { temperature: 65.0 },
        },
      });
      assert.equal(telemetryRes.status, 201);

      const rule = (await (await client('/api/rules/RULE_001')).json()).data;
      assert.equal(rule.lastTriggeredAt, null);

      const alertsRes = await client('/api/rules/alerts');
      const alertsBody = await alertsRes.json();
      assert.equal(alertsBody.count, 0);
    });

    it('POST /api/rules/evaluate returns structured matched and unmatched condition reports', async () => {
      const payload = {
        telemetry: {
          deviceId: 'TURBINE_001',
          temperature: 87.5, // Matches RULE_001 (> 80)
        },
      };

      const res = await client('/api/rules/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.matchedCount, 1);
      assert.equal(body.unmatchedCount, 0);
      assert.equal(body.data.matched[0].ruleId, 'RULE_001');
      assert.equal(body.data.matched[0].matched, true);
    });

    it('POST /api/rules/evaluate returns 400 when telemetry object or deviceId is missing', async () => {
      const res = await client('/api/rules/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {},
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.details.some((d) => d.field === 'deviceId'));
    });
  });

  // =========================================================================
  // 6. Expected File & Mirror Resolution Checks
  // =========================================================================
  describe('Service Resolution Checks', () => {
    it('verifies backend/src/services/ruleEvaluation.service.js exports', async () => {
      const mod = await import('../src/services/ruleEvaluation.service.js');
      assert.equal(typeof mod.RuleEvaluationService, 'function');
      assert.equal(typeof mod.ruleEvaluationService.processTelemetry, 'function');
      assert.equal(typeof mod.ruleEvaluationService.evaluateCondition, 'function');
    });

    it('verifies backend/src/services/ruleEvaluationService.js mirror', async () => {
      const mod = await import('../src/services/ruleEvaluationService.js');
      assert.equal(typeof mod.RuleEvaluationService, 'function');
    });

    it('verifies server/src/services/ruleEvaluationService.js mirror', async () => {
      const mod = await import('../../server/src/services/ruleEvaluationService.js');
      assert.equal(typeof mod.RuleEvaluationService, 'function');
    });

    it('verifies backend/src/services/index.js exports all services', async () => {
      const services = await import('../src/services/index.js');
      assert.ok(services.deviceService);
      assert.ok(services.telemetryService);
      assert.ok(services.ruleService);
      assert.ok(services.ruleEvaluationService);
    });
  });
});
