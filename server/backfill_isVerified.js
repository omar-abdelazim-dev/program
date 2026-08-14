import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

// Run once after deploying the pre-registration-OTP auth system. Every
// account created before that change has no concept of email verification
// (isVerified defaults to false), and login/protect now hard-block on that
// field — without this, every existing user gets locked out on their next
// login or request. Grandfathering them in as verified is the standard,
// safe move here: nothing about their account changed, only the bar for
// *new* signups did.
const backfill = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Backfill...');

    const result = await User.updateMany(
      { isVerified: { $ne: true } },
      { $set: { isVerified: true } }
    );

    console.log(`Backfilled isVerified: true on ${result.modifiedCount} pre-existing user(s).`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill Error:', error);
    process.exit(1);
  }
};

backfill();
