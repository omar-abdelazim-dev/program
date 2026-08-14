import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from './app.js';
import User from './models/User.js';

process.env.JWT_SECRET = 'testsecret';
// 'development' specifically — otpService only prints its dev-debug OTP log
// on that exact value, which is how captureOtp() below reads codes back
// without a live mail provider. Also skips rate limiting, same as this file
// already relied on 'test' doing before.
process.env.NODE_ENV = 'development';

let mongoServer;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`\x1b[32m✓ ${name}\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m✗ ${name}\n  ${err.message}\x1b[0m`);
    process.exit(1);
  }
};

// Captures the OTP otpService prints to console in development, the same
// way a human tester would — there's no API that returns a raw code, only
// the hash gets persisted.
const captureOtp = async (fn) => {
  const originalLog = console.log;
  let captured = null;
  console.log = (...args) => {
    const match = args.join(' ').match(/Code: (\d{6})/);
    if (match) captured = match[1];
    originalLog(...args);
  };
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  if (!captured) throw new Error('Expected an OTP to be logged, but none was captured');
  return captured;
};

const runTests = async () => {
  console.log('Starting Auth Security Tests...');

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  let userCookie, csrfToken, refreshToken, userId;

  // Setup user — registration now requires proving email ownership via OTP
  // before the account can be created at all (authController.register).
  await test('Register User (pre-registration OTP flow)', async () => {
    const otp = await captureOtp(() =>
      request(app).post('/api/auth/send-registration-otp').send({
        name: 'Auth Test',
        email: 'auth@test.com',
        password: 'Password1!',
      })
    );

    const verifyRes = await request(app).post('/api/auth/verify-registration-otp').send({ email: 'auth@test.com', otp });
    if (verifyRes.status !== 200) throw new Error(`verify-registration-otp failed: ${JSON.stringify(verifyRes.body)}`);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Auth Test',
      email: 'auth@test.com',
      password: 'Password1!',
      role: 'student'
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);

    // Email ownership was already proven above, so the account is verified
    // immediately — there's no separate post-registration verification step.
    const user = await User.findOne({ email: 'auth@test.com' });
    if (!user.isVerified) throw new Error('User should be verified immediately after OTP-gated registration');
    userId = user._id;
  });

  await test('Account Lockout: under 5 failures does not lock', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
      if (res.status !== 401) throw new Error(`Expected 401 on failed attempt ${i + 1}, got ${res.status}`);
    }
    const user = await User.findOne({ email: 'auth@test.com' });
    if (user.lockedForReset) throw new Error('Account should not be locked before the 5th consecutive failure');
  });

  await test('A correct login before the 5th failure resets the counter', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const user = await User.findOne({ email: 'auth@test.com' });
    if (user.failedLoginAttempts !== 0) throw new Error('failedLoginAttempts should reset to 0 on successful login');
  });

  await test('Account Lockout: 5th consecutive failure locks the account (LOCKED_PENDING_RESET)', async () => {
    for (let i = 0; i < 4; i++) {
      await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
    if (res.status !== 423) throw new Error(`Expected 423 on the 5th failure, got ${res.status}`);
    if (res.body.code !== 'LOCKED_PENDING_RESET') throw new Error(`Expected code LOCKED_PENDING_RESET, got ${res.body.code}`);

    // The correct password doesn't help either — this is a hard lock, not a
    // timed one. Only the reset-password OTP flow (tested next) clears it.
    const stillLocked = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (stillLocked.status !== 423) throw new Error(`Expected the correct password to still be rejected while locked, got ${stillLocked.status}`);
  });

  await test('Locked account recovers via the password-reset OTP flow', async () => {
    const otp = await captureOtp(() =>
      request(app).post('/api/auth/reset-password/request-otp').send({ email: 'auth@test.com', newPassword: 'Password1!' })
    );

    const verifyRes = await request(app).post('/api/auth/reset-password/verify-otp').send({ email: 'auth@test.com', otp });
    if (verifyRes.status !== 200) throw new Error(`reset-password/verify-otp failed: ${JSON.stringify(verifyRes.body)}`);

    const user = await User.findOne({ email: 'auth@test.com' });
    if (user.lockedForReset) throw new Error('lockedForReset should be cleared after a successful password reset');
    if (user.failedLoginAttempts !== 0) throw new Error('failedLoginAttempts should be cleared after a successful password reset');

    const loginRes = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (loginRes.status !== 200) throw new Error(`Expected login to succeed after reset, got ${loginRes.status}`);
    const cookies = loginRes.headers['set-cookie'];
    userCookie = cookies.find(c => c.startsWith('token=')).split(';')[0];
    refreshToken = cookies.find(c => c.startsWith('refreshToken=')).split(';')[0];
    csrfToken = cookies.find(c => c.startsWith('csrfToken=')).split(';')[0].split('=')[1];
  });

  await test('Get Sessions (Multiple logins)', async () => {
    const res = await request(app)
      .get('/api/auth/sessions')
      .set('Cookie', `${userCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken);

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.sessions.length < 1) throw new Error('Missing sessions');
  });

  await test('JWT Refresh Flow', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `${refreshToken}`)

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);

    const cookies = res.headers['set-cookie'];
    userCookie = cookies.find(c => c.startsWith('token=')).split(';')[0];
    const newRefreshToken = cookies.find(c => c.startsWith('refreshToken=')).split(';')[0];

    // Test reuse (Should revoke all)
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', `${refreshToken}`);
    if (reuse.status !== 401) throw new Error(`Expected 401 on token reuse, got ${reuse.status}`);

    // Get fresh tokens again for next test
    refreshToken = newRefreshToken;
  });

  await test('Password Change Invalidates Session', async () => {
    // Change password manually in DB to 1 min ago to test invalidation
    await User.updateOne({ email: 'auth@test.com' }, { passwordChangedAt: new Date(Date.now() + 60000) });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${userCookie}; csrfToken=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken);

    if (res.status !== 401) throw new Error(`Expected 401 after password change, got ${res.status}`);
  });

  console.log('\nALL TARGETED SECURITY TESTS PASSED');
  await mongoose.disconnect();
  await mongoServer.stop();
  process.exit(0);
};

runTests().catch(console.error);
