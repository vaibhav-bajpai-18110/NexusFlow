import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import {
  Device,
  DeviceSchemaDefinition,
  Rule,
  RuleSchemaDefinition,
  Telemetry,
  TelemetrySchemaDefinition,
  User,
  validateDeviceSchema,
  validateRuleSchema,
  validateTelemetrySchema,
} from '../src/models/index.js';
import {
  flushPersistence,
  initializePersistence,
  isDatabaseConnected,
} from '../src/services/persistence.service.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('Database Layer & API Routes Verification (Task 10)', () => {
  // =========================================================================
  // 1. Mongoose Models & Schema Verification
  // =========================================================================
  describe('Mongoose Models (Coordinating with Manya)', () => {
    it('exports all Mongoose models from backend/src/models/index.js', () => {
      assert.ok(Device, 'Device model must be exported');
      assert.ok(Telemetry, 'Telemetry model must be exported');
      assert.ok(User, 'User model must be exported');
      assert.ok(Rule, 'Rule model must be exported');
    });

    it('validates compliant Device model instance', async () => {
      const dev = new Device({
        deviceId: 'TEST_TURBINE_99',
        name: 'Test Turbine 99',
        deviceType: 'Temperature',
        unit: '°C',
        status: 'online',
        location: 'Zone C',
        lastValue: 84.5,
      });

      await assert.doesNotReject(async () => {
        await dev.validate();
      });
      assert.equal(dev.deviceId, 'TEST_TURBINE_99');
      assert.equal(dev.type, 'Temperature');
    });

    it('rejects Device instance missing required fields', async () => {
      const dev = new Device({});
      await assert.rejects(async () => {
        await dev.validate();
      }, (err) => {
        assert.ok(err.errors.deviceId);
        assert.ok(err.errors.name);
        return true;
      });
    });

    it('validates compliant Telemetry model instance', async () => {
      const telem = new Telemetry({
        deviceId: 'TURBINE_001',
        timestamp: new Date(),
        metrics: { temperature: 82.4, vibration: 1.1 },
      });

      await assert.doesNotReject(async () => {
        await telem.validate();
      });
    });

    it('rejects Telemetry instance missing required deviceId or timestamp', async () => {
      const telem = new Telemetry({});
      await assert.rejects(async () => {
        await telem.validate();
      }, (err) => {
        assert.ok(err.errors.deviceId);
        assert.ok(err.errors.timestamp);
        return true;
      });
    });

    it('validates compliant User model instance', async () => {
      const user = new User({
        name: 'Operator Alice',
        email: 'alice@nexusflow.io',
        passwordHash: 'hashed_secret_123',
        role: 'user',
      });

      await assert.doesNotReject(async () => {
        await user.validate();
      });
      assert.equal(user.email, 'alice@nexusflow.io');
    });

    it('rejects User instance with invalid email format', async () => {
      const user = new User({
        name: 'Bob',
        email: 'not-an-email',
        passwordHash: 'secret',
      });

      await assert.rejects(async () => {
        await user.validate();
      }, (err) => {
        assert.ok(err.errors.email);
        return true;
      });
    });

    it('re-exports all SchemaDefinitions and validators for backward compatibility', () => {
      assert.ok(DeviceSchemaDefinition);
      assert.ok(RuleSchemaDefinition);
      assert.ok(TelemetrySchemaDefinition);
      assert.equal(typeof validateDeviceSchema, 'function');
      assert.equal(typeof validateRuleSchema, 'function');
      assert.equal(typeof validateTelemetrySchema, 'function');
    });
  });

  // =========================================================================
  // 2. Database Connection Handling (backend/src/config/db.js)
  // =========================================================================
  describe('Database Connection Configuration', () => {
    it('throws descriptive error when MONGODB_URI is missing or empty', async () => {
      await assert.rejects(
        async () => {
          await connectDB('');
        },
        {
          message: /MONGODB_URI is missing/i,
        }
      );
    });

    it('disconnectDB executes cleanly when disconnected', async () => {
      await disconnectDB();
      assert.equal(mongoose.connection.readyState, 0);
    });

    it('reports database status accurately in persistence service', () => {
      assert.equal(typeof isDatabaseConnected(), 'boolean');
      assert.equal(isDatabaseConnected(), false);
    });

    it('initializePersistence handles in-memory fallback without throwing', async () => {
      await assert.doesNotReject(async () => {
        await initializePersistence();
      });
    });

    it('flushPersistence executes cleanly with no pending writes', async () => {
      await assert.doesNotReject(async () => {
        await flushPersistence();
      });
    });
  });

  // =========================================================================
  // 3. API Routes and Error Handling Verification
  // =========================================================================
  describe('Full Route & Error Handling Verification', () => {
    // Health Check
    it('GET /api/health reports runtime metadata and database status', async () => {
      const res = await client('/api/health');
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.status, 'ok');
      assert.equal(body.database, 'disconnected');
    });

    // Device API
    it('verifies Device API endpoints return structured responses', async () => {
      const listRes = await client('/api/devices');
      const listBody = await listRes.json();
      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listBody.data));

      const statsRes = await client('/api/devices/stats');
      const statsBody = await statsRes.json();
      assert.equal(statsRes.status, 200);
      assert.ok(typeof statsBody.data.totalDevices === 'number');

      const getRes = await client('/api/devices/TURBINE_001');
      assert.equal(getRes.status, 200);

      // Error handling: 404 for unknown device
      const notFoundRes = await client('/api/devices/UNKNOWN_9999');
      assert.equal(notFoundRes.status, 404);
      const notFoundBody = await notFoundRes.json();
      assert.equal(notFoundBody.status, 'fail');
    });

    // Telemetry API
    it('verifies Telemetry API endpoints and error handling', async () => {
      const latestRes = await client('/api/telemetry/latest');
      assert.equal(latestRes.status, 200);

      const statsRes = await client('/api/telemetry/stats');
      assert.equal(statsRes.status, 200);

      // Error handling: 400 for invalid query parameter
      const badQueryRes = await client('/api/telemetry?limit=-5');
      assert.equal(badQueryRes.status, 400);
      const badQueryBody = await badQueryRes.json();
      assert.equal(badQueryBody.status, 'fail');
      assert.ok(Array.isArray(badQueryBody.details));
    });

    // Rule API
    it('verifies Rule API endpoints and error handling', async () => {
      const rulesRes = await client('/api/rules');
      assert.equal(rulesRes.status, 200);

      const ruleDetailRes = await client('/api/rules/RULE_001');
      assert.equal(ruleDetailRes.status, 200);

      const alertsRes = await client('/api/rules/alerts');
      assert.equal(alertsRes.status, 200);

      // Error handling: 404 for unknown rule
      const notFoundRuleRes = await client('/api/rules/RULE_UNKNOWN_99');
      assert.equal(notFoundRuleRes.status, 404);

      // Error handling: 400 for invalid rule creation
      const badRuleRes = await client('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      assert.equal(badRuleRes.status, 400);
      const badRuleBody = await badRuleRes.json();
      assert.equal(badRuleBody.status, 'fail');
      assert.ok(Array.isArray(badRuleBody.details));
    });
  });
});
