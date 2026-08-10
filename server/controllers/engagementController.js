import Question from '../models/Question.js';
import Announcement from '../models/CourseAnnouncement.js';
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
      .populate('student', 'name avatarUrl')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};

// @desc    Get count of unread (unanswered) questions for the instructor
// @route   GET /api/engagement/questions/unread-count
// @access  Private/Instructor
export const getUnreadQuestionsCount = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).select('_id');
    const courseIds = courses.map((c) => c._id);

    // Count questions that are pending (regardless of reply) or approved but unanswered
    const count = await Question.countDocuments({
      course: { $in: courseIds },
      status: 'pending' // Just count pending as "needing attention/approval"
    });

    res.status(200).json({ count });
  } catch (error) {
    console.error('Error fetching unread questions count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
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

    const question = await Question.findById(id).populate('course', 'instructor title');

    if (!question || !question.course) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Security check: Ensure the instructor replying actually owns the course
    if (question.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reply to this question' });
    }

    const isEdit = !!question.reply;

    question.reply = reply;
    question.repliedAt = new Date();
    question.status = 'approved'; // Automatically approve when instructor replies
    await question.save();

    // Create a notification for the student only if it's a new reply
    if (!isEdit) {
      await Notification.create({
        user: question.student,
        title: `New Reply`,
        message: `${req.user.name} replies on your comment on ${question.course.title}`,
        type: 'qa_reply',
        link: `/learn/${question.course._id}?tab=qa`,
      });
    }

    res.status(200).json({ message: 'Reply posted successfully', question });
  } catch (error) {
    console.error('Error posting reply:', error);
    res.status(500).json({ message: 'Failed to post reply' });
  }
};

// @desc    Delete a reply from a question
// @route   DELETE /api/engagement/questions/:id/reply
// @access  Private/Instructor
export const deleteReply = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).populate('course', 'instructor');

    if (!question || !question.course) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Security check
    if (question.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this reply' });
    }

    question.reply = '';
    question.repliedAt = null;
    await question.save();

    res.status(200).json({ message: 'Reply deleted successfully', question });
  } catch (error) {
    console.error('Error deleting reply:', error);
    res.status(500).json({ message: 'Failed to delete reply' });
  }
};

// @desc    Delete a student question
// @route   DELETE /api/engagement/questions/:id
// @access  Private
export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findById(id).populate('course', 'instructor');

    if (!question || !question.course) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Security check: must be course instructor OR the student who asked it
    const isInstructor = question.course.instructor.toString() === req.user.id.toString();
    const isStudent = question.student.toString() === req.user.id.toString();

    if (!isInstructor && !isStudent) {
      return res.status(403).json({ message: 'Not authorized to delete this question' });
    }

    await question.deleteOne();

    res.status(200).json({ message: 'Question deleted successfully', question });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
};

// @desc    Edit a student question
// @route   PATCH /api/engagement/questions/:id
// @access  Private
export const editQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question: newQuestionText } = req.body;

    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Security check: must be the student who asked it
    if (question.student.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this question' });
    }

    // Can only edit if status is 'pending'
    if (question.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot edit question after it has been approved or deleted' });
    }

    question.question = newQuestionText;
    await question.save();

    res.status(200).json({ message: 'Question updated successfully', question });
  } catch (error) {
    console.error('Error editing question:', error);
    res.status(500).json({ message: 'Failed to edit question' });
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

// @desc    Create a new question for a course
// @route   POST /api/engagement/questions
// @access  Private
export const createQuestion = async (req, res) => {
  try {
    const { courseId, question } = req.body;
    
    if (!courseId || !question) {
      return res.status(400).json({ message: 'Course ID and question content are required' });
    }

    const newQuestion = await Question.create({
      course: courseId,
      student: req.user.id,
      question
    });

    // Notify the instructor
    const course = await Course.findById(courseId);
    if (course) {
      await Notification.create({
        user: course.instructor,
        title: `New Question in ${course.title}`,
        message: `A student asked a new question in your course.`,
        type: 'qa_new',
      });
    }

    res.status(201).json({ message: 'Question posted successfully', question: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ message: 'Failed to post question' });
  }
};

// @desc    Update a question's status (e.g., approve)
// @route   PATCH /api/engagement/questions/:id/status
// @access  Private/Instructor
export const updateQuestionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'deleted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const question = await Question.findById(id).populate('course', 'instructor');

    if (!question || !question.course) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this question' });
    }

    question.status = status;
    await question.save();

    res.status(200).json({ message: 'Status updated successfully', question });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({ message: 'Failed to update question status' });
  }
};

// @desc    Get all questions for a specific course (filtered for students)
// @route   GET /api/engagement/course/:courseId/questions
// @access  Private
export const getCourseQuestions = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Students only see approved questions, or their own pending questions
    const questions = await Question.find({
      course: courseId,
      $or: [
        { status: 'approved' },
        { status: 'pending', student: req.user.id }
      ]
    })
      .populate('student', 'name avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({ questions });
  } catch (error) {
    console.error('Error fetching course questions:', error);
    res.status(500).json({ message: 'Failed to fetch course questions' });
  }
};

