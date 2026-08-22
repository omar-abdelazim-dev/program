import assert from 'node:assert/strict';
import { healthHandler, readinessHandler } from './app.js';

const response = () => ({
  statusCode: undefined,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const health = response();
healthHandler({}, health);
assert.equal(health.statusCode, 200);
assert.equal(health.body.status, 'ok');
assert.equal(typeof health.body.uptimeSeconds, 'number');

// Importing app does not connect MongoDB, so this verifies an API process
// cannot become ready until the dependency needed to serve traffic exists.
const readiness = response();
await readinessHandler({}, readiness);
assert.equal(readiness.statusCode, 503);
assert.equal(readiness.body.status, 'not_ready');

console.log('Operational endpoint tests passed');
