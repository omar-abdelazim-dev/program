import Review from '../models/Review.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import ModulePurchase from '../models/ModulePurchase.js';
import StandaloneLessonPurchase from '../models/StandaloneLessonPurchase.js';
import logger from '../utils/logger.js';

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
    logger.error('Error fetching instructor reviews:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

// @desc    Report a review (instructor flags it for admin review)
// @route   PATCH /api/reviews/:id/report
// @access  Private/Instructor
export const reportReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('course', 'instructor');

    if (!review || !review.course) {
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
    logger.error('Error reporting review:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to report review' });
  }
};

// @desc    Get recent reviews for a course
// @route   GET /api/reviews/course/:id
// @access  Public
export const getCourseReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ course: req.params.id })
      .populate('student', 'name avatarUrl')
      .sort({ createdAt: -1 })
      .limit(10);
      
    res.status(200).json({ reviews });
  } catch (error) {
    logger.error('Error fetching course reviews:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to fetch course reviews' });
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

    // Verify student is enrolled — supports standard, module-purchased, and standalone-lesson courses
    const enrollment = await Enrollment.findOne({ student: req.user.id, course: courseId });
    let isActuallyEnrolled = enrollment?.status === 'approved';

    if (!isActuallyEnrolled) {
      const modPurchase = await ModulePurchase.findOne({ student: req.user.id, course: courseId, status: 'approved' });
      if (modPurchase) isActuallyEnrolled = true;
    }

    if (!isActuallyEnrolled) {
      const standalonePurchase = await StandaloneLessonPurchase.findOne({ student: req.user.id, course: courseId, status: 'approved' });
      if (standalonePurchase) isActuallyEnrolled = true;
    }

    if (!isActuallyEnrolled) {
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
    logger.error('Error creating review:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to submit review' });
  }
};

// @desc    Update a review (student)
// @route   PUT /api/reviews/:id
// @access  Private/Student
export const updateReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    
    if (!rating || !text) {
      return res.status(400).json({ message: 'Rating and text are required' });
    }

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.student.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this review' });
    }

    review.rating = rating;
    review.text = text;
    await review.save();
    
    const populatedReview = await Review.findById(review._id).populate('student', 'name avatarUrl');

    res.status(200).json({ message: 'Review updated successfully', review: populatedReview });
  } catch (error) {
    logger.error('Error updating review:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to update review' });
  }
};

// @desc    Delete a review (student)
// @route   DELETE /api/reviews/:id
// @access  Private/Student
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.student.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    logger.error('Error deleting review:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to delete review' });
  }
};
