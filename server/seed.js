import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Course from './models/Course.js';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB!');

    console.log('Creating a mock instructor...');
    // Create an instructor to own the courses
    let instructor = await User.findOne({ email: 'instructor@mock.com' });
    if (!instructor) {
      instructor = await User.create({
        name: 'Dr. Sarah',
        email: 'instructor@mock.com',
        password: 'password123', // Will be hashed by model middleware
        role: 'instructor'
      });
    }

    console.log('Clearing old courses...');
    // Clear existing mock courses if any
    await Course.deleteMany({});

    console.log('Seeding mock courses...');
    const courses = [
      {
        title: "Advanced React Patterns",
        description: "Learn how to build scalable and maintainable React applications using advanced patterns and best practices.",
        price: 1500,
        category: "Development",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop"
      },
      {
        title: "Python for Data Science",
        description: "A comprehensive guide to using Python for data analysis, visualization, and machine learning.",
        price: 2200,
        category: "Data",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?q=80&w=600&auto=format&fit=crop"
      },
      {
        title: "UI/UX Masterclass",
        description: "Master the art of designing beautiful and intuitive user interfaces with Figma.",
        price: 1800,
        category: "Design",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop"
      },
      {
        title: "Business Marketing",
        description: "Learn modern marketing strategies to grow your business in the digital age.",
        price: 1200,
        category: "Business",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop"
      }
    ];

    await Course.insertMany(courses);
    console.log('Successfully seeded database with mock courses!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
