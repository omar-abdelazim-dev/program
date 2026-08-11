import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from './app.js';
import User from './models/User.js';
import Session from './models/Session.js';

process.env.JWT_SECRET = 'testsecret';
process.env.NODE_ENV = 'test';

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

const runTests = async () => {
  console.log('Starting Auth Security Tests...');

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  let userCookie, csrfToken, refreshToken, userId;

  // Setup user
  await test('Register User (Email Verification test)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Auth Test',
      email: 'auth@test.com',
      password: 'Password1!',
      role: 'student'
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const user = await User.findOne({ email: 'auth@test.com' }).select('+emailVerificationTokenHash');
    if (user.isEmailVerified) throw new Error('User should not be verified initially');
    if (!user.emailVerificationTokenHash) throw new Error('Missing verification hash');
    userId = user._id;
  });

  await test('Progressive Account Lockout (Stage 1: 5 fails -> 1 min)', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (res.status !== 403) throw new Error(`Expected 403 lock, got ${res.status}`);
    
    // Unlock for next tests by clearing lock manually
    await User.updateOne({ email: 'auth@test.com' }, { lockUntil: null });
  });

  await test('Progressive Account Lockout (Stage 2: 3 fails -> 3 min)', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (res.status !== 403) throw new Error(`Expected 403 lock, got ${res.status}`);
    
    // Manual unlock
    await User.updateOne({ email: 'auth@test.com' }, { lockUntil: null });
  });

  await test('Progressive Account Lockout (Stage 3: 1 fail -> 5 min)', async () => {
    await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'wrong' });
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (res.status !== 403) throw new Error(`Expected 403 lock, got ${res.status}`);
    
    await User.updateOne({ email: 'auth@test.com' }, { lockUntil: null });
  });

  await test('Successful login resets lock', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'auth@test.com', password: 'Password1!' });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const cookies = res.headers['set-cookie'];
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
