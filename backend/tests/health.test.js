import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';

const { default: app } = await import('../src/app.js');

let server;
let baseUrl;

describe('Backend server & /api/health', () => {
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

  it('GET /api/health returns 200 with service health payload', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
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
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.status, 'fail');
    assert.match(body.message, /Route not found/);
  });

  it('returns 400 JSON error for malformed JSON payload', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
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
