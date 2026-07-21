import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import User from './models/User.js';

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find instructor
    const inst = await User.findOne({ name: 'instructor' });
    if (!inst) { console.log('No inst'); process.exit(1); }
    
    // Test the same aggregate logic
    const instructorId = inst._id;
    const result = await Transaction.aggregate([
      { $match: { instructor: instructorId } },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $and: [{ $eq: ['$type', 'course_sale'] }, { $eq: ['$status', 'cleared'] }] },
                    { $and: [{ $eq: ['$type', 'payout_request'] }, { $ne: ['$status', 'rejected'] }] }
                  ]
                },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    console.log('Balance result:', result);
    
    const transactions = await Transaction.find({ instructor: instructorId }).lean();
    console.log('Found transactions count:', transactions.length);
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

test();
