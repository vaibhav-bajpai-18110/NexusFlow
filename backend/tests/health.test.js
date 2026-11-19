import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import app from '../src/app.js';
import { createTestClient } from './helpers/testClient.js';

process.env.NODE_ENV = 'test';

const client = createTestClient(app);

describe('Backend server & /api/health', () => {
  it('GET /api/health returns 200 with service health payload', async () => {
    const response = await client('/api/health');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'nexusflow-backend');
    assert.equal(typeof body.timestamp, 'string');
    assert.equal(typeof body.uptimeSeconds, 'number');
    assert.equal(typeof body.memoryUsageMB.rss, 'number');
  });

  it('returns 404 JSON error for unknown routes', async () => {
    const response = await client('/api/does-not-exist');
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.status, 'fail');
    assert.match(body.message, /Route not found/);
  });

  it('returns 400 JSON error for malformed JSON payload', async () => {
    const response = await client('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"brokenJson": ',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.status, 'fail');
    assert.equal(body.message, 'Invalid JSON payload');
  });
});
