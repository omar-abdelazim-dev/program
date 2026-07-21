import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './models/Course.js';
import User from './models/User.js';

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const courses = await Course.find({ title: { $in: ['backend', 'web fundamntal'] } });
    console.log('Courses found:', courses.length);
    for (const c of courses) {
      const u = await User.findById(c.instructor);
      console.log(`Course: ${c.title}, Instructor: ${u.name} (${u.email}), ID: ${u._id}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
test();
