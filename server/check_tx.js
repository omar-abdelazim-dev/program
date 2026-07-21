import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import User from './models/User.js';

dotenv.config();

const check = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const txs = await Transaction.find().populate('instructor', 'name email');
    console.log(`Found ${txs.length} transactions in DB.`);
    
    const instructorCounts = {};
    txs.forEach(tx => {
      const name = tx.instructor ? tx.instructor.name : 'Unknown';
      instructorCounts[name] = (instructorCounts[name] || 0) + 1;
    });
    
    console.log('Transactions per instructor:', instructorCounts);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

check();
