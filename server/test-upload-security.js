import request from 'supertest';
import app from './app.js';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from './models/User.js';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'testsecret';

let mongoServer;
let token;

async function runTests() {
  console.log('Starting Upload Security Tests...');
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  const instructor = await User.create({
    name: 'Instructor', email: 'inst@test.com', password: 'Password123!', role: 'instructor', isVerified: true
  });
  token = jwt.sign({ userId: instructor._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (e) {
      console.error(`✗ ${name}\n  ${e.message}`);
      failed++;
    }
  };

  // Mock Cloudinary so we don't actually hit the network
  const { default: cloudinary } = await import('./config/cloudinary.js');
  const stream = await import('stream');
  
  cloudinary.uploader.upload_stream = (options, cb) => {
    const s = new stream.Writable({
      write(chunk, encoding, callback) { callback(); },
      final(callback) {
        cb(null, { secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' });
        callback();
      }
    });
    return s;
  };

  // 1. Valid image upload
  await test('Valid PNG upload', async () => {
    // 1x1 valid PNG
    const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', `token=${token}; csrfToken=12345`)
      .set('X-CSRF-Token', '12345')
      .attach('image', pngBuffer, { filename: 'test.png', contentType: 'image/png' });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
  });

  // 2. Renamed executable to .png
  await test('Renamed executable to .png (Magic Byte mismatch)', async () => {
    // Fake exe buffer starting with MZ
    const exeBuffer = Buffer.from('4d5a90000300000004000000ffff0000b800000000000000400000000000000000000000000000000000000000000000000000000000000000000000f00000000e1fba0e00b409cd21b8014ccd21546869732070726f6772616d2063616e6e6f742062652072756e20696e20444f53206d6f64652e0d0d0a2400000000000000', 'hex');
    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', `token=${token}; csrfToken=12345`)
      .set('X-CSRF-Token', '12345')
      .attach('image', exeBuffer, { filename: 'malware.png', contentType: 'image/png' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 3. SVG upload blocked
  await test('SVG upload blocked', async () => {
    const svgBuffer = Buffer.from('<svg></svg>');
    const res = await request(app)
      .post('/api/uploads/image')
      .set('Cookie', `token=${token}; csrfToken=12345`)
      .set('X-CSRF-Token', '12345')
      .attach('image', svgBuffer, { filename: 'test.svg', contentType: 'image/svg+xml' });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  await mongoServer.stop();
  if (failed > 0) process.exit(1);
}

runTests();
