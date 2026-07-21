import Review from '../models/Review.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';

// @desc    Get all reviews for courses owned by the instructor
// @route   GET /api/reviews/instructor
// @access  Private/Instructor
export const getInstructorReviews = async (req, res) => {
  try {
    const courses = await Course.find({ instructor: req.user.id }).select('_id');
    const courseIds = courses.map(c => c._id);

    const reviews = await Review.find({ course: { $in: courseIds } })
      .populate('student', 'name avatar')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    // Calculate average rating
    let averageRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      averageRating = parseFloat((sum / reviews.length).toFixed(1));
    }

    res.status(200).json({
      reviews,
      averageRating,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error('Error fetching instructor reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

// @desc    Report a review (instructor flags it for admin review)
// @route   PATCH /api/reviews/:id/report
// @access  Private/Instructor
export const reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('course', 'instructor');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Security: only the course's instructor can report reviews on their course
    if (review.course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to report this review' });
    }

    review.isReported = true;
    await review.save();

    res.status(200).json({ message: 'Review reported to admins', review });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ message: 'Failed to report review' });
  }
};

// @desc    Submit a review for a course (student)
// @route   POST /api/reviews
// @access  Private/Student
export const createReview = async (req, res) => {
  try {
    const { courseId, rating, text } = req.body;

    if (!courseId || !rating || !text) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Verify student is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({ message: 'You must be enrolled in this course to leave a review' });
    }

    const review = await Review.create({
      student: req.user.id,
      course: courseId,
      rating,
      text,
    });

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this course' });
    }
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to submit review' });
  }
};
