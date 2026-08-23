import assert from 'node:assert/strict';
import authRoutes from './routes/authRoutes.js';
import { authorizeDoor, authorizeWithDoor } from './middleware/authMiddleware.js';

const routePaths = authRoutes.stack
  .filter((layer) => layer.route)
  .map((layer) => layer.route.path);

assert.ok(routePaths.includes('/admin/login'));
assert.ok(routePaths.includes('/superadmin/login'));

const runMiddleware = (middleware, user, authScope) => {
  let statusCode = 200;
  let nextCalled = false;
  const req = { user, authScope };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  };
  middleware(req, res, () => { nextCalled = true; });
  return { statusCode, nextCalled };
};

assert.equal(runMiddleware(authorizeDoor('admin'), { role: 'admin' }, 'admin').nextCalled, true);
assert.equal(runMiddleware(authorizeDoor('superadmin'), { role: 'superadmin' }, 'admin').statusCode, 403);
assert.equal(runMiddleware(authorizeDoor('admin'), { role: 'admin' }, null).statusCode, 403);
assert.equal(runMiddleware(authorizeWithDoor('instructor', 'admin'), { role: 'instructor' }, null).nextCalled, true);
assert.equal(runMiddleware(authorizeWithDoor('instructor', 'admin'), { role: 'admin' }, null).statusCode, 403);

console.log('ADMIN DOOR SEPARATION TESTS PASSED');
