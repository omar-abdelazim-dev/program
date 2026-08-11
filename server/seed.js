import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Course from './models/Course.js';
import Module from './models/Module.js';
import Lesson from './models/Lesson.js';

// Public domain sample clips (Google's GTV test bucket) so the video player
// has something real to play — these are not meant to match lesson topics.
const SAMPLE_VIDEO_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
];

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

    console.log('Clearing old courses, modules, and lessons...');
    // Clear existing mock courses/modules/lessons if any
    await Course.deleteMany({});
    await Module.deleteMany({});
    await Lesson.deleteMany({});

    console.log('Seeding mock courses...');
    const courses = [
      {
        title: "Advanced React Patterns",
        description: "Learn how to build scalable and maintainable React applications using advanced patterns and best practices.",
        price: 1500,
        category: "Development",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=600&auto=format&fit=crop",
        lessons: [
          "Component Composition Patterns",
          "Advanced Hooks: useReducer & useContext",
          "Performance Optimization with memo & useMemo",
          "Building a Reusable Design System",
        ],
      },
      {
        title: "Python for Data Science",
        description: "A comprehensive guide to using Python for data analysis, visualization, and machine learning.",
        price: 2200,
        category: "Data",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?q=80&w=600&auto=format&fit=crop",
        lessons: [
          "Python Fundamentals for Data Analysis",
          "Working with Pandas DataFrames",
          "Data Visualization with Matplotlib",
          "Intro to Machine Learning with scikit-learn",
        ],
      },
      {
        title: "UI/UX Masterclass",
        description: "Master the art of designing beautiful and intuitive user interfaces with Figma.",
        price: 1800,
        category: "Design",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=600&auto=format&fit=crop",
        lessons: [
          "Design Thinking Fundamentals",
          "Wireframing & Prototyping in Figma",
          "Usability Testing & Iteration",
        ],
      },
      {
        title: "Business Marketing",
        description: "Learn modern marketing strategies to grow your business in the digital age.",
        price: 1200,
        category: "Business",
        instructor: instructor._id,
        status: "approved",
        thumbnailUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=600&auto=format&fit=crop",
        lessons: [
          "Digital Marketing Fundamentals",
          "Social Media Strategy",
          "Content Marketing & SEO",
          "Analytics & Growth Metrics",
        ],
      },
    ];

    for (const { lessons, ...courseData } of courses) {
      const course = await Course.create(courseData);
      const module = await Module.create({
        course: course._id,
        title: 'Course Content',
        order: 1,
        status: 'published',
      });
      const lessonDocs = lessons.map((title, i) => ({
        title,
        videoUrl: SAMPLE_VIDEO_URLS[i % SAMPLE_VIDEO_URLS.length],
        module: module._id,
        order: i + 1,
      }));
      await Lesson.insertMany(lessonDocs);
      console.log(`  - "${course.title}": ${lessonDocs.length} lessons`);
    }

    console.log('Successfully seeded database with mock courses and lessons!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
