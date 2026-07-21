import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import Course from './models/Course.js';
import User from './models/User.js';

dotenv.config();

const debug = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find the course from the screenshot
    const course = await Course.findOne({ title: 'web fundamntal' });
    if (!course) {
      console.log('Course "web fundamntal" not found!');
      process.exit(1);
    }
    
    console.log('Found course:', course.title, 'instructor ID:', course.instructor);
    
    // Find instructor details
    const instructor = await User.findById(course.instructor);
    console.log('Instructor Name:', instructor.name);
    
    // Find transactions for this instructor
    const txs = await Transaction.find({ instructor: course.instructor });
    console.log('Transactions for this instructor:', txs.length);
    if (txs.length > 0) {
      console.log('Sample tx:', txs[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

debug();
