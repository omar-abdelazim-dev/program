import Question from '../models/Question.js';
import Announcement from '../models/Announcement.js';
import Course from '../models/Course.js';
import Notification from '../models/Notification.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get questions for all courses owned by the instructor
// @route   GET /api/engagement/questions
// @access  Private/Instructor
export const getInstructorQuestions = async (req, res) => {
  try {
    // 1. Find all courses owned by this instructor
    const courses = await Course.find({ instructor: req.user.id }).select('_id');
    const courseIds = courses.map((c) => c._id);

    // 2. Find all questions for these courses, sorted by newest first
    const questions = await Question.find({ course: { $in: courseIds } })
      .populate('student', 'name avatar')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

// @desc    Reply to a student question
// @route   POST /api/engagement/questions/:id/reply
// @access  Private/Instructor
export const replyToQuestion = async (req, res) => {
  try {
    const { reply } = req.body;
    const { id } = req.params;

    if (!reply) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const question = await Question.findById(id).populate('course', 'instructor');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Security check: Ensure the instructor replying actually owns the course
    if (question.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reply to this question' });
    }

    question.reply = reply;
    question.repliedAt = new Date();
    await question.save();

    // Create a notification for the student
    await Notification.create({
      user: question.student,
      title: `Instructor replied to your question`,
      message: `Your instructor has replied to your question in ${question.course.title}.`,
      type: 'qa_reply',
    });

    res.status(200).json({ message: 'Reply posted successfully', question });
  } catch (error) {
    console.error('Error posting reply:', error);
    res.status(500).json({ message: 'Failed to post reply' });
  }
};

// @desc    Create an announcement for a specific course
// @route   POST /api/engagement/announcements
// @access  Private/Instructor
export const createAnnouncement = async (req, res) => {
  try {
    const { courseId, title, message } = req.body;

    if (!courseId || !title || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Security check: Ensure the instructor creating the announcement owns the course
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create announcements for this course' });
    }

    const announcement = await Announcement.create({
      course: courseId,
      instructor: req.user.id,
      title,
      message,
    });

    // Notify all enrolled students
    const enrollments = await Enrollment.find({ course: courseId }).select('student');
    const studentIds = enrollments.map(e => e.student);

    if (studentIds.length > 0) {
      const notifications = studentIds.map(studentId => ({
        user: studentId,
        title: `New Announcement: ${title}`,
        message: `An announcement was posted in ${course.title}.`,
        type: 'announcement',
      }));
      await Notification.insertMany(notifications);
    }

    res.status(201).json({ message: 'Announcement created successfully', announcement });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};
