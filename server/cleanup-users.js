import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function clean() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/program');
  const keepEmails = [
    'ahmadnashat04@gmail.com',
    'student@gmail.com',
    'students@gmail.com',
    'admin@gmail.com',
    'superadmin@gmail.com'
  ];
  const result = await User.deleteMany({ email: { $nin: keepEmails } });
  console.log(`Deleted ${result.deletedCount} users`);
  const remaining = await User.find({}, 'email role');
  console.log('Remaining:', remaining);
  process.exit(0);
}

clean().catch(e => { console.error(e); process.exit(1); });