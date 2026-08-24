import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Module from "../models/Module.js";
import Enrollment from "../models/Enrollment.js";
import Review from "../models/Review.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import * as emailService from "../utils/emailService.js";
import {
  getModulesWithLessons,
  getLessonIdsForCourse,
} from "../utils/courseContent.js";
import mongoose from "mongoose";
import fs from "fs";
import logger from "../utils/logger.js";
import { logAudit } from "../utils/auditLogger.js";

// Helper: attach averageRating and reviewsCount to an array of course docs
export const attachReviewStats = async (courses) => {
  const courseIds = courses.map((c) => c._id);
  const stats = await Review.aggregate([
    { $match: { course: { $in: courseIds } } },
    {
      $group: { _id: "$course", avg: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);
  const statsMap = {};
  stats.forEach((s) => {
    statsMap[s._id.toString()] = {
      avg: parseFloat(s.avg.toFixed(1)),
      count: s.count,
    };
  });
  return courses.map((c) => {
    const obj = c.toObject ? c.toObject() : { ...c };
    const s = statsMap[obj._id.toString()];
    obj.averageRating = s ? s.avg : 0;
    obj.reviewsCount = s ? s.count : 0;
    return obj;
  });
};

// @route   POST /api/courses
// @access  Private (instructor only)
// title/description/price are validated by validateCreateCourse before this
// runs; category is optional (INS-03 de-required it in favor of college).
export const createCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      major,
      semester,
      college,
      academicType,
      academicGroup,
      thumbnailUrl,
      courseType,
    } = req.body;

    const isOngoing = courseType === 'ongoing';

    const course = await Course.create({
      title,
      description,
      price: isOngoing ? 0 : Number(price),
      category: category || "",
      major: major || "",
      semester:
        semester !== undefined && semester !== "" ? semester : undefined,
      college: college || "",
      academicType: academicType || 'college',
      academicGroup: academicGroup || (academicType === 'college' ? college || '' : ''),
      thumbnailUrl: thumbnailUrl || "",
      instructor: req.user.id, // taken from the verified JWT, never trust a client-sent instructor ID
      status: "draft", // All new courses start in draft until instructor builds content and submits for review
      courseType, // validated to 'full' | 'ongoing' by validateCreateCourse; immutable after creation
    });

    res.status(201).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error creating course" });
  }
};

// @route   GET /api/courses/mine
// @access  Private (instructor only) — shows ALL of the instructor's own
// courses regardless of status, so they can see pending/rejected ones too.
export const getMyCourses = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const baseQuery = { instructor: req.user.id };

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(baseQuery).sort({ createdAt: -1 });
      return res.status(200).json({ courses });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(baseQuery),
      Course.find(baseQuery).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({
      courses,
      pagination: { page: pageNum, limit: limitNum, totalPages, totalItems },
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching your courses" });
  }
};

// @route   GET /api/courses/stats
// @access  Private (instructor only)
export const getInstructorStats = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.user.id);

    // Aggregation for course-level stats
    const stats = await Course.aggregate([
      { $match: { instructor: instructorId } },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "course",
          as: "enrollments",
        },
      },
      {
        $lookup: {
          from: "modules",
          localField: "_id",
          foreignField: "course",
          as: "modules",
        },
      },
      {
        $lookup: {
          from: "lessons",
          localField: "modules._id",
          foreignField: "module",
          as: "lessons",
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          totalEnrolled: { $size: "$enrollments" },
          totalRevenue: { $sum: "$enrollments.amountPaid" },
          lessonsCount: { $size: "$lessons" },
          totalCompletions: {
            $sum: {
              $map: {
                input: "$enrollments",
                as: "en",
                in: { $size: "$$en.completedLessons" },
              },
            },
          },
        },
      },
    ]);

    // Format stats and compute completion rate
    const courseStats = stats.map((course) => {
      let completionRate = 0;
      if (course.totalEnrolled > 0 && course.lessonsCount > 0) {
        const totalPossibleCompletions =
          course.totalEnrolled * course.lessonsCount;
        completionRate = Math.round(
          (course.totalCompletions / totalPossibleCompletions) * 100,
        );
      }
      return {
        id: course._id,
        title: course.title,
        enrolled: course.totalEnrolled,
        revenue: course.totalRevenue,
        completionRate: `${completionRate}%`,
      };
    });

    // Aggregation for time-series charts (revenue and student growth)
    const timeSeries = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseDoc",
        },
      },
      { $unwind: "$courseDoc" },
      { $match: { "courseDoc.instructor": instructorId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amountPaid" },
          students: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Create base skeleton for the last 7 months to ensure continuous charts
    const fullTimeSeries = [];
    const currentDate = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - i,
        1,
      );
      fullTimeSeries.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        name: monthNames[d.getMonth()],
        revenue: 0,
        students: 0,
      });
    }

    // Merge actual data into skeleton
    timeSeries.forEach((ts) => {
      const match = fullTimeSeries.find(
        (f) => f.year === ts._id.year && f.month === ts._id.month,
      );
      if (match) {
        match.revenue = ts.revenue;
        match.students = ts.students;
      }
    });

    res.status(200).json({ courseStats, timeSeriesData: fullTimeSeries });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

// @route   GET /api/courses
// @access  Public — the student-facing catalog. Only ever returns approved
// courses; pending/rejected courses must never leak here.
export const getApprovedCourses = async (req, res) => {
  try {
    const {
      search,
      category,
      major,
      semester,
      college,
      userCollege,
      userMajor,
      academicType,
      academicGroup,
      page,
      limit,
    } = req.query;

    const filter = { status: "approved" };
    if (category) filter.category = category;
    if (semester) filter.semester = parseInt(semester, 10);
    if (academicType) filter.academicType = academicType;
    if (academicGroup) filter.academicGroup = academicGroup;

    const andConditions = [];

    if (userCollege || userMajor) {
      const userConditions = [];
      if (userCollege) {
        userConditions.push(
          { college: { $regex: new RegExp(escapeRegex(userCollege), "i") } },
          { academicGroup: { $regex: new RegExp(escapeRegex(userCollege), "i") } }
        );
      }
      if (userMajor) {
        const words = userMajor.split(/\s+/).filter((w) => w.length > 2);
        const patterns = [userMajor, ...words].map(
          (p) => new RegExp(escapeRegex(p), "i")
        );
        for (const pat of patterns) {
          userConditions.push(
            { major: pat },
            { category: pat },
            { title: pat }
          );
        }
      }
      if (userConditions.length > 0) {
        andConditions.push({ $or: userConditions });
      }
    } else {
      if (major) {
        const words = major.split(/\s+/).filter((w) => w.length > 2);
        const patterns = [major, ...words].map(
          (p) => new RegExp(escapeRegex(p), "i")
        );
        const majorConditions = [];
        for (const pat of patterns) {
          majorConditions.push(
            { major: pat },
            { category: pat },
            { title: pat },
            { college: pat }
          );
        }
        andConditions.push({ $or: majorConditions });
      }
      if (college) {
        andConditions.push({
          $or: [
            { college: { $regex: new RegExp(escapeRegex(college), "i") } },
            { academicGroup: { $regex: new RegExp(escapeRegex(college), "i") } },
          ],
        });
      }
    }

    if (search) {
      // Search course content and its assigned academic audience, as well as
      // instructor names. This lets a student search a major (for example,
      // "Computer Science") and see every course assigned to that major.
      const regex = { $regex: escapeRegex(search), $options: "i" };
      const matchingInstructors = await mongoose
        .model("User")
        .find({ name: regex })
        .select("_id");
      andConditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { major: regex },
          { college: regex },
          { academicGroup: regex },
          { category: regex },
          { instructor: { $in: matchingInstructors.map((u) => u._id) } },
        ],
      });
    }

    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(filter)
        .populate("instructor", "name avatarUrl isProgramInstructor") // include instructor's name + avatar, nothing more sensitive
        .sort({ createdAt: -1 });

      // Attach review stats to each course
      const coursesWithReviews = await attachReviewStats(courses);
      return res.status(200).json({ courses: coursesWithReviews });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate("instructor", "name avatarUrl isProgramInstructor")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    // Attach review stats to each course
    const coursesWithReviews = await attachReviewStats(courses);
    res.status(200).json({
      courses: coursesWithReviews,
      pagination: { page: pageNum, limit: limitNum, totalPages, totalItems },
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching courses" });
  }
};

// @route   GET /api/courses/:id
// @access  Public (for approved courses) — used on the course details page.
// Also allows the owning instructor or an admin to view a non-approved course.
export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "instructor",
      "name isProgramInstructor",
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isOwner =
      req.user && course.instructor?._id?.toString() === req.user.id?.toString();
    const isAdmin =
      req.user && (req.user.role === "admin" || req.user.role === "superadmin");
    const isEnrolled = req.user
      ? await Enrollment.exists({
          $or: [{ student: req.user.id }, { user: req.user.id }],
          course: course._id,
        })
      : false;

    if (course.status !== "approved" && !isOwner && !isAdmin && !isEnrolled) {
      if (course.status === "suspended") {
        return res.status(403).json({
          message: "This course has been suspended by administration.",
        });
      }
      return res
        .status(403)
        .json({ message: "This course is not yet available." });
    }

    // Deliberately excludes videoUrl and quiz content for unauthenticated/non-enrolled public,
    // but includes full lesson metadata for the course owner and administrators.
    const lessonFields = (isOwner || isAdmin)
      ? "title order module status lessonType videoUrl attachmentUrl attachmentTitle quiz type duration"
      : "title order module status lessonType";

    const grouped = await getModulesWithLessons(
      course._id,
      lessonFields,
    );
    const modules = grouped.map(({ module, lessons }) => ({
      _id: module._id,
      title: module.title,
      description: module.description,
      order: module.order,
      price: module.price || 0,
      lessons,
    }));

    res.status(200).json({ course, modules });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching course" });
  }
};

// @route   GET /api/courses/pending
// @access  Private (admin only)
export const getPendingCourses = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const filter = { status: "pending" };

    if (page === undefined && limit === undefined) {
      const courses = await Course.find(filter)
        .populate("instructor", "name email isProgramInstructor")
        .sort({ createdAt: 1 }); // oldest first — first submitted, first reviewed

      return res.status(200).json({ courses });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, courses] = await Promise.all([
      Course.countDocuments(filter),
      Course.find(filter)
        .populate("instructor", "name email isProgramInstructor")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;
    res.status(200).json({
      courses,
      pagination: { page: pageNum, limit: limitNum, totalPages, totalItems },
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching pending courses" });
  }
};

// @route   PATCH /api/courses/:id/approve
// @access  Private (admin only)
export const approveCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "draft", rejectionReason: "", approvedBy: req.user.id },
      { new: true }, // return the updated document, not the pre-update one
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Send notification to instructor
    await Notification.create({
      user: course.instructor,
      title: "Course Approved",
      message: `Your course "${course.title}" has been approved! It is now saved as a Draft. You can publish it to go live whenever you are ready.`,
      type: "system",
    });

    try {
      const instructor = await User.findById(course.instructor).select(
        "name email",
      );
      if (instructor && instructor.email) {
        await emailService.sendCourseApprovedEmail({
          toEmail: instructor.email,
          instructor_name: instructor.name || "Instructor",
          course_title: course.title,
          course_category: course.category || "General",
          approval_date: new Date().toLocaleDateString(),
          dashboard_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/instructor/courses/${course._id}`,
          help_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/help`,
          settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/instructor/settings`,
        });
      }
    } catch (err) {
      logger.error("Failed to send course approval email", {
        err: err.message,
      });
    }

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error approving course" });
  }
};

// @route   PATCH /api/courses/:id/submit-for-review
// @access  Private (instructor only)
export const submitCourseForReview = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized to submit this course" });
    }

    if (course.status !== "draft" && course.status !== "rejected") {
      return res.status(400).json({ message: "Only courses in draft or rejected status can be submitted for review" });
    }

    // Must have at least 1 module and at least 1 lesson in that module
    const modules = await Module.find({ course: course._id });
    if (modules.length === 0) {
      return res.status(400).json({
        message: "Course must have at least one module with at least one lesson before submitting for admin review",
      });
    }

    const lessons = await Lesson.find({ module: { $in: modules.map((m) => m._id) } });
    const hasModuleWithLesson = modules.some((m) =>
      lessons.some((l) => l.module.toString() === m._id.toString())
    );

    if (!hasModuleWithLesson || lessons.length === 0) {
      return res.status(400).json({
        message: "Course must have at least one module with at least one lesson before submitting for admin review",
      });
    }

    course.status = "pending";
    course.rejectionReason = "";
    await course.save();

    try {
      const admins = await User.find({
        role: { $in: ["admin", "superadmin"] },
      }).select("email name");
      const instructor = await User.findById(req.user.id).select("name");
      await emailService.sendAdminNewRequestEmail({
        adminEmails: admins,
        request_id: course._id,
        request_type_label: course.courseType === "ongoing" ? "Ongoing Course Submission" : "Full Course Submission",
        request_type_tag: "COURSE",
        submitted_date: new Date().toLocaleDateString(),
        item_title: course.title,
        requester_name: instructor?.name || "Instructor",
        requester_role: "Instructor",
        review_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/courses/${course._id}`,
        queue_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/requests`,
        settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/settings`,
      });
    } catch (err) {
      logger.error("Failed to send admin notification for course submission", {
        err: err.message,
      });
    }

    res.status(200).json({ course, message: "Course submitted for admin review" });
  } catch (error) {
    logger.error("An error occurred submitting course for review", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error submitting course for review" });
  }
};

// @route   PATCH /api/courses/:id/publish
// @access  Private (instructor only)
export const publishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.instructor.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to control this course" });
    }

    if (course.status === "draft") {
      // Courses must have been approved by an admin before going live
      if (!course.approvedBy) {
        return res.status(400).json({
          message: "Course must be approved by an administrator before it can be published live",
        });
      }

      const lessonIds = await getLessonIdsForCourse(course._id);
      if (lessonIds.length === 0) {
        return res.status(400).json({
          message: "Add at least one lesson before publishing this course live",
        });
      }
      course.status = "approved";
      if (course.courseType === "ongoing") {
        // Going live starts the 14-day inactivity clock even if the
        // instructor hasn't explicitly toggled an individual lesson to
        // 'published' yet (see lessonController.updateLesson for the other
        // place this timestamp is stamped).
        if (!course.lastPublishedContentAt)
          course.lastPublishedContentAt = new Date();
        course.draftStartedAt = null;
        course.inactivityWarningSentAt = null;
        course.inactivityUrgentWarningSentAt = null;
        course.draftExpirationWarningSentAt = null;
      }
    } else if (course.status === "approved") {
      course.status = "draft";
      if (course.courseType === "ongoing") {
        // Manually taking the course down also starts the 90-day draft
        // clock — the expiration job doesn't distinguish "went to Draft via
        // inactivity" from "instructor chose to pause it" (spec §9).
        course.draftStartedAt = new Date();
      }
    } else {
      return res.status(400).json({
        message: "Course must be approved before you can publish it live",
      });
    }

    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error toggling course live status" });
  }
};

// @route   PATCH /api/courses/:id/convert-to-full
// @access  Private (instructor only, must own the course)
// spec §9 Option 4 / §14: Ongoing -> complete content + set a full-course
// price -> submit for a fresh admin review, exactly like a new Full Course.
// Once approved and published, the normal Full Course content-lock applies.
export const convertOngoingToFull = async (req, res) => {
  try {
    const { price } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to control this course" });
    }
    if (course.courseType !== "ongoing") {
      return res.status(400).json({
        message: "Only Ongoing Courses can be converted to a Full Course",
      });
    }

    const lessonIds = await getLessonIdsForCourse(course._id);
    if (lessonIds.length === 0) {
      return res.status(400).json({
        message: "Add at least one lesson before converting to a Full Course",
      });
    }
    if (
      price === undefined ||
      price === "" ||
      Number.isNaN(Number(price)) ||
      Number(price) < 250 || Number(price) > 5000
    ) {
      return res
        .status(400)
      .json({ message: "Full course price must be between 250 EGP and 5000 EGP." });
    }

    course.courseType = "full";
    course.price = Number(price);
    course.status = "pending"; // fresh admin review, same as a brand-new course
    course.rejectionReason = "";
    // Ongoing-only fields no longer apply once this is a Full Course.
    course.lastPublishedContentAt = undefined;
    course.draftStartedAt = undefined;
    course.inactivityWarningSentAt = undefined;
    course.inactivityUrgentWarningSentAt = undefined;
    course.draftExpirationWarningSentAt = undefined;

    await course.save();

    await logAudit({
      action: "COURSE_CONVERTED_ONGOING_TO_FULL",
      module: "courses",
      userId: req.user.id,
      targetId: course._id,
      targetModel: "Course",
      newValue: { price: course.price },
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error converting course to Full Course" });
  }
};

// @route   POST /api/courses/:id/request-price-change
// @access  Private (instructor only, must own the course)
// courseType:'full' only (spec §5). Never touches course.price itself —
// that only happens in approvePriceChange, once an admin signs off.
export const requestPriceChange = async (req, res) => {
  try {
    const { requestedPrice } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to control this course" });
    }
    if (course.courseType !== "full") {
      return res.status(400).json({
        message: "Price-change requests are only available for Full Courses",
      });
    }
    if (course.status !== "approved") {
      return res.status(400).json({
        message: "Price change requests are only available for live courses.",
      });
    }
    const requested = Number(requestedPrice);
    if (!Number.isFinite(requested) || requested < 250 || requested > 5000) {
      return res.status(400).json({ message: "Full course price must be between 250 EGP and 5000 EGP." });
    }
    if (course.pendingPriceChange?.status === "pending") {
      return res.status(409).json({
        message: "A price-change request is already pending admin approval",
      });
    }
    if (requested === course.price) {
      return res.status(400).json({
        message: "Requested price must be different from the current price",
      });
    }

    course.pendingPriceChange = {
      requestedPrice: requested,
      status: "pending",
      requestedAt: new Date(),
    };
    await course.save();

    try {
      const admins = await User.find({
        role: { $in: ["admin", "superadmin"] },
      }).select("email name");
      const instructor = await User.findById(req.user.id).select("name");
      await emailService.sendAdminNewRequestEmail({
        adminEmails: admins,
        request_id: course._id,
        request_type_label: "Ongoing Course Full Submission",
        request_type_tag: "COURSE",
        submitted_date: new Date().toLocaleDateString(),
        item_title: course.title,
        requester_name: instructor?.name || "Instructor",
        requester_role: "Instructor",
        review_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/courses/${course._id}`,
        queue_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/requests`,
        settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/admin/settings`,
      });
    } catch (err) {
      logger.error("Failed to send admin notification for convert-to-full", {
        err: err.message,
      });
    }

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error requesting price change" });
  }
};

// @route   GET /api/courses/price-change-requests
// @access  Private (admin/superadmin)
export const getPriceChangeRequests = async (req, res) => {
  try {
    const courses = await Course.find({
      "pendingPriceChange.status": "pending",
    })
      .populate("instructor", "name email")
      .sort({ "pendingPriceChange.requestedAt": 1 });
    res.status(200).json({ courses });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching price-change requests" });
  }
};

// @route   PATCH /api/courses/:id/price-change/approve
// @access  Private (admin/superadmin)
export const approvePriceChange = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.pendingPriceChange?.status !== "pending") {
      return res
        .status(409)
        .json({ message: "This course has no pending price-change request" });
    }

    const oldPrice = course.price;
    const newPrice = course.pendingPriceChange.requestedPrice;
    course.price = newPrice;
    course.pendingPriceChange = undefined;
    await course.save();

    await logAudit({
      action: "COURSE_PRICE_CHANGE_APPROVED",
      module: "courses",
      userId: req.user.id,
      targetId: course._id,
      targetModel: "Course",
      oldValue: { price: oldPrice },
      newValue: { price: newPrice },
    });

    await Notification.create({
      user: course.instructor,
      title: "Price Change Approved",
      message: `Your requested price change for "${course.title}" has been approved. The new price is EGP ${newPrice}.`,
      type: "system",
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error approving price change" });
  }
};

// @route   PATCH /api/courses/:id/price-change/reject
// @access  Private (admin/superadmin)
export const rejectPriceChange = async (req, res) => {
  try {
    const { reason } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.pendingPriceChange?.status !== "pending") {
      return res
        .status(409)
        .json({ message: "This course has no pending price-change request" });
    }

    const requestedPrice = course.pendingPriceChange.requestedPrice;
    course.pendingPriceChange = undefined;
    await course.save();

    await logAudit({
      action: "COURSE_PRICE_CHANGE_REJECTED",
      module: "courses",
      userId: req.user.id,
      targetId: course._id,
      targetModel: "Course",
      oldValue: { requestedPrice },
      newValue: { reason: reason || "" },
    });

    await Notification.create({
      user: course.instructor,
      title: "Price Change Rejected",
      message: `Your requested price change for "${course.title}" (to EGP ${requestedPrice}) was rejected.${reason ? ` Reason: ${reason}` : ""}`,
      type: "system",
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error rejecting price change" });
  }
};

// @route   PATCH /api/courses/:id/reject
// @access  Private (admin only)
export const rejectCourse = async (req, res) => {
  try {
    const { reason } = req.body;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason || "" },
      { new: true },
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    try {
      const instructor = await User.findById(course.instructor).select(
        "name email",
      );
      if (instructor && instructor.email) {
        await emailService.sendCourseRejectedEmail({
          toEmail: instructor.email,
          instructor_name: instructor.name || "Instructor",
          course_title: course.title,
          rejection_reason: reason || "Does not meet our content standards.",
          review_date: new Date().toLocaleDateString(),
          edit_course_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/instructor/courses/${course._id}/edit`,
          help_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/help`,
          settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/instructor/settings`,
        });
      }
    } catch (err) {
      logger.error("Failed to send course rejection email", {
        err: err.message,
      });
    }

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error rejecting course" });
  }
};

// @route   PUT /api/courses/:id
// @access  Private (owning instructor, or admin/superadmin for compliance edits)
// price is intentionally never read from req.body here (INS-05) — once a
// course is submitted, price can only change... it can't; it's fixed at
// creation. Any price field sent in the request body is silently ignored,
// both in the UI (which no longer renders the field) and here at the API
// level, so the restriction can't be bypassed by calling the API directly.
export const updateCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      major,
      semester,
      college,
      academicType,
      academicGroup,
      thumbnailUrl,
    } = req.body;

    const course = req.resource; // Provided by verifyOwnership middleware

    course.title = title || course.title;
    course.description = description || course.description;
    course.category = category || course.category;
    if (major !== undefined) course.major = major;
    if (semester !== undefined)
      course.semester = semester === "" ? undefined : semester;
    if (college !== undefined) course.college = college;
    if (academicType !== undefined) course.academicType = academicType;
    if (academicGroup !== undefined) course.academicGroup = academicGroup;
    if (thumbnailUrl !== undefined) {
      course.thumbnailUrl = thumbnailUrl;
    }
    // Optional: reset status to pending when heavily edited
    // course.status = 'pending';

    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error updating course" });
  }
};

// @route   GET /api/courses/:id/enrollments
// @access  Private (admin/superadmin) — lets the Course Management tab show
// who's enrolled in an already-approved course.
export const getCourseEnrollments = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollments = await Enrollment.find({ course: course._id })
      .populate("student", "name email avatarUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({ enrollments });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching course enrollments" });
  }
};

// @route   PATCH /api/courses/:id/unpublish
// @access  Private (admin/superadmin) — pulls a previously-approved course
// out of the public catalog without deleting it; approveCourse can bring it
// back later.
export const unpublishCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "unpublished" },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error unpublishing course" });
  }
};

// @route   PATCH /api/courses/:id/suspend
// @access  Private (admin/superadmin)
export const suspendCourse = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: "Suspension reason is required" });
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: "suspended", rejectionReason: reason },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Send notification to instructor
    await Notification.create({
      user: course.instructor,
      title: "Course Suspended",
      message: `Your course "${course.title}" has been suspended. You can republish your course by clicking on the course card after resolving the suspended reason. Reason: ${reason}`,
      type: "system",
    });

    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error suspending course" });
  }
};

// @route   PATCH /api/courses/:id/republish
// @access  Private (instructor only)
export const republishCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    if (course.instructor.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to republish this course" });
    }
    if (course.status !== "suspended" && course.status !== "rejected") {
      return res.status(400).json({
        message: "Only suspended or rejected courses can be republished",
      });
    }

    course.status = "pending";
    await course.save();
    res.status(200).json({ course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error republishing course" });
  }
};

// @route   DELETE /api/courses/:id
// @access  Private (instructor, admin, superadmin)
// Instructors can delete their own courses. Admins can delete any course.
export const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "superadmin";
    if (!isAdmin) {
      // Instructors can delete their own courses (see courseRoutes.js), but
      // never one a paying, approved student is already enrolled in — that's
      // still admin-only territory, same as it always was, now enforced here
      // instead of by blanket route authorization.
      const hasApprovedEnrollment = await Enrollment.exists({
        course: course._id,
        status: "approved",
      });
      if (hasApprovedEnrollment) {
        return res.status(409).json({
          message:
            "This course has enrolled students and cannot be deleted directly — contact an admin.",
        });
      }
    }

    // Cleanup associated lessons and modules. Lessons are keyed off
    // Module, not Course directly, so modules must be resolved first.
    const modules = await Module.find({ course: course._id });
    const moduleIds = modules.map((m) => m._id);
    await Lesson.deleteMany({ module: { $in: moduleIds } });
    await Module.deleteMany({ course: course._id });
    await Course.findByIdAndDelete(req.params.id);
    // Enrollments generally shouldn't be deleted so students maintain history,
    // or they could be depending on business logic. We'll leave them or soft-delete.

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error deleting course" });
  }
};

// @route   PATCH /api/courses/:id/request-delete
// @access  Private (instructor only, must own the course)
export const requestDeleteCourse = async (req, res) => {
  try {
    const course = req.resource; // Provided by verifyOwnership middleware

    if (course.deletionRequested) {
      return res.status(409).json({
        message: "Deletion has already been requested for this course",
      });
    }

    course.deletionRequested = true;
    await course.save();

    res
      .status(200)
      .json({ message: "Deletion request submitted for admin review", course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error requesting course deletion" });
  }
};

// @route   GET /api/courses/deletion-requests
// @access  Private (admin/superadmin) — feeds the Course Management tab's
// deletion-request review queue.
export const getDeletionRequests = async (req, res) => {
  try {
    const courses = await Course.find({ deletionRequested: true })
      .populate("instructor", "name email")
      .sort({ updatedAt: -1 });

    res.status(200).json({ courses });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching deletion requests" });
  }
};

// @route   PATCH /api/courses/:id/reject-deletion
// @access  Private (admin/superadmin) — admin declines the request; the
// course stays live and the instructor can request again later if needed.
export const rejectDeletionRequest = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { deletionRequested: false },
      { new: true },
    );
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ message: "Deletion request rejected", course });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error rejecting deletion request" });
  }
};
