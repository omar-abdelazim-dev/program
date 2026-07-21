import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Enrollment from './models/Enrollment.js';
import Course from './models/Course.js';
import Transaction from './models/Transaction.js';

dotenv.config();

const backfill = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Backfill...');

    // Delete existing transactions just in case we re-run this or have test data
    await Transaction.deleteMany({});
    console.log('Cleared existing transactions...');

    const enrollments = await Enrollment.find().populate('course');
    console.log(`Found ${enrollments.length} total enrollments.`);

    let count = 0;
    for (const enrollment of enrollments) {
      if (enrollment.course && enrollment.course.price > 0 && enrollment.course.instructor) {
        const instructorCut = enrollment.course.price * 0.7;
        
        await Transaction.create({
          instructor: enrollment.course.instructor,
          amount: instructorCut,
          type: 'course_sale',
          status: 'cleared',
          description: `Course Sale - ${enrollment.course.title}`,
          course: enrollment.course._id,
          createdAt: enrollment.createdAt, // Backdate the transaction to when the enrollment happened!
        });
        count++;
      }
    }

    console.log(`Successfully backfilled ${count} transactions.`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill Error:', error);
    process.exit(1);
  }
};

backfill();
