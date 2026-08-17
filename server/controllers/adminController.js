import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Course from "../models/Course.js";
import Enrollment from "../models/Enrollment.js";
import Lesson from "../models/Lesson.js";
import StandaloneLesson from "../models/StandaloneLesson.js";
import PromoCode from "../models/PromoCode.js";
import InstructorViolation from "../models/InstructorViolation.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { logAudit } from "../utils/auditLogger.js";
import Notification from "../models/Notification.js";
import logger from "../utils/logger.js";
import * as emailService from "../utils/emailService.js";

// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getStats = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalInstructors = await User.countDocuments({ role: "instructor" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalSuperAdmins = await User.countDocuments({ role: "superadmin" });

    // Course Management tab header cards (ADM-05): Total Courses, Pending
    // Courses, Pending Lessons, Pending Quizzes.
    const totalCourses = await Course.countDocuments();
    const pendingCourses = await Course.countDocuments({ status: "pending" });
    const pendingQuizzes = await Lesson.countDocuments({ lessonType: "quiz", status: "pending" });
    const pendingModuleLessons = await Lesson.countDocuments({ lessonType: { $ne: "quiz" }, status: "pending" });
    const pendingStandaloneLessons = await StandaloneLesson.countDocuments({ status: "pending" });
    const pendingLessons = pendingModuleLessons + pendingStandaloneLessons;
    const pendingEnrollments = await Enrollment.countDocuments({ status: "pending" });
    const pendingPayouts = await Transaction.countDocuments({ type: "payout_request", status: "pending" });

    // Revenue total + per-category enrollment counts, computed in Mongo
    // instead of pulling every enrollment (with its populated course) into
    // app memory and looping in JS. $facet runs both aggregations in a
    // single round trip.
    const [statsAgg] = await Enrollment.aggregate([
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "course",
        },
      },
      // preserveNullAndEmptyArrays: a course can be missing (e.g. deleted)
      // — revenue still counts that enrollment, categoryCounts must not.
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          revenue: [
            {
              $group: {
                _id: null,
                total: { $sum: { $ifNull: ["$amountPaid", 0] } },
              },
            },
          ],
          byCategory: [
            { $match: { "course.category": { $exists: true, $ne: "" } } },
            { $group: { _id: "$course.category", count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const totalRevenue = statsAgg.revenue[0]?.total || 0;
    const categoryCounts = {};
    statsAgg.byCategory.forEach((c) => {
      categoryCounts[c._id] = c.count;
    });

    // 30-day-over-30-day signup growth per role, for the trend badges on the
    // overview cards.
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const getGrowth = async (role) => {
      const currentPeriod = await User.countDocuments({
        role,
        createdAt: { $gte: thirtyDaysAgo },
      });
      const previousPeriod = await User.countDocuments({
        role,
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
      });

      if (previousPeriod === 0) {
        // If there were no users in the previous period, mathematically growth is infinite.
        // Showing 100% looks like hardcoded fake data to users, so we return 0.
        return 0;
      }
      return Number(
        (((currentPeriod - previousPeriod) / previousPeriod) * 100).toFixed(1),
      );
    };

    const growth = {
      students: await getGrowth("student"),
      instructors: await getGrowth("instructor"),
      admins: await getGrowth("admin"),
      superAdmins: await getGrowth("superadmin"),
    };

    const platformCommission = 30;
    const companyShare = (totalRevenue * platformCommission) / 100;

    res.status(200).json({
      totalStudents,
      totalInstructors,
      totalAdmins,
      totalSuperAdmins,
      totalCourses,
      pendingCourses,
      pendingLessons,
      pendingLessonsCount: pendingLessons,
      pendingQuizzes,
      pendingQuizzesCount: pendingQuizzes,
      pendingEnrollments,
      pendingPayouts,
      totalRevenue,
      platformCommission,
      companyShare,
      categoryCounts,
      growth,
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching stats" });
  }
};

// @route   GET /api/admin/revenue-analytics
// @access  Private (Admin)
// Real revenue + enrollment counts bucketed by month, for the last 12
// months — no commission split or payout math, just what was actually
// paid (Enrollment.amountPaid), aggregated in Mongo. Zero-filled so months
// with no enrollments still show up as a bar instead of a gap.
export const getRevenueAnalytics = async (req, res) => {
  try {
    const start = new Date();
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const monthly = await Enrollment.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: { $ifNull: ["$amountPaid", 0] } },
          enrollments: { $sum: 1 },
        },
      },
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
    const cursor = new Date(start);
    const series = [];
    for (let i = 0; i < 12; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      const bucket = monthly.find(
        (m) => m._id.year === year && m._id.month === month,
      );
      series.push({
        label: monthNames[cursor.getMonth()],
        revenue: bucket?.revenue || 0,
        enrollments: bucket?.enrollments || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const totalRevenue = series.reduce((sum, m) => sum + m.revenue, 0);
    const totalEnrollments = series.reduce((sum, m) => sum + m.enrollments, 0);
    const avgOrderValue =
      totalEnrollments === 0 ? 0 : Math.round(totalRevenue / totalEnrollments);

    res
      .status(200)
      .json({ series, totalRevenue, totalEnrollments, avgOrderValue });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching revenue analytics" });
  }
};

// @route   GET /api/admin/analytics
// @access  Private (Admin)
// Aggregates course performance and student completion rates across all courses.
export const getStudentAnalytics = async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });

    const stats = await Course.aggregate([
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

    let globalTotalCompletions = 0;
    let globalTotalPossibleCompletions = 0;

    const coursePerformance = stats.map((course) => {
      let completionRate = 0;
      if (course.totalEnrolled > 0 && course.lessonsCount > 0) {
        const totalPossibleCompletions =
          course.totalEnrolled * course.lessonsCount;
        completionRate =
          (course.totalCompletions / totalPossibleCompletions) * 100;

        globalTotalCompletions += course.totalCompletions;
        globalTotalPossibleCompletions += totalPossibleCompletions;
      }
      return {
        _id: course._id,
        title: course.title,
        enrolledStudents: course.totalEnrolled,
        completionRate: completionRate,
        avgScore: null,
      };
    });

    const avgCompletionRate =
      globalTotalPossibleCompletions > 0
        ? (globalTotalCompletions / globalTotalPossibleCompletions) * 100
        : 0;

    res.status(200).json({
      overview: {
        totalStudents,
        avgCompletionRate,
        totalQuizAttempts: 0,
      },
      coursePerformance,
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching student analytics" });
  }
};

// @route   GET /api/admin/instructor-analytics
// @access  Private (Admin)
// Aggregates instructor performance including revenue and ratings.
export const getInstructorAnalytics = async (req, res) => {
  try {
    const instructors = await User.aggregate([
      { $match: { role: "instructor" } },
      // Step 1: Get all courses for this instructor
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "instructor",
          as: "courses",
        },
      },
      // Step 2: Add courseIds as a plain array of ObjectIds for use in subsequent lookups
      {
        $addFields: {
          courseIds: "$courses._id",
        },
      },
      // Step 3: Lookup enrollments using $in — supports array of IDs correctly
      {
        $lookup: {
          from: "enrollments",
          let: { courseIds: "$courseIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$course", "$$courseIds"] } } },
          ],
          as: "enrollments",
        },
      },
      // Step 4: Lookup reviews using $in — same pattern
      {
        $lookup: {
          from: "reviews",
          let: { courseIds: "$courseIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$course", "$$courseIds"] } } },
          ],
          as: "reviews",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          lastName: 1,
          email: 1,
          coursesCount: { $size: "$courses" },
          totalStudents: { $size: "$enrollments" },
          totalRevenue: { $sum: "$enrollments.amountPaid" },
          avgRating: {
            $cond: {
              if: { $gt: [{ $size: "$reviews" }, 0] },
              then: { $avg: "$reviews.rating" },
              else: 0,
            },
          },
        },
      },
    ]);

    res.status(200).json({ instructorPerformance: instructors });
  } catch (error) {
    logger.error("Error fetching instructor analytics", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching instructor analytics" });
  }
};

// @route   GET /api/admin/activity
// @access  Private (Admin)
// Merges the most recent signups (admin/superadmin only), enrollments, and
// course submissions into a single reverse-chronological feed for the
// dashboard's "Recent Activity" tab.
export const getRecentActivity = async (req, res) => {
  try {
    const recentUsers = await User.find({
      role: { $in: ["admin", "superadmin"] },
    })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEnrollments = await Enrollment.find()
      .populate("student", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentCourses = await Course.find()
      .populate("instructor", "name isProgramInstructor")
      .populate("approvedBy", "name role")
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [];

    recentUsers.forEach((u) => {
      activities.push({
        id: `usr_${u._id}`,
        type: "user",
        title: `New ${u.role === "superadmin" ? "Super Admin" : "Admin"} Added`,
        description: `Account created for ${u.name} (${u.email}).`,
        date: u.createdAt,
      });
    });

    recentEnrollments.forEach((e) => {
      activities.push({
        id: `enr_${e._id}`,
        type: "enrollment",
        title: "New Student Enrollment",
        description: `${e.student?.name || "A student"} enrolled in '${e.course?.title || "a course"}'.`,
        date: e.createdAt,
      });
    });

    recentCourses.forEach((c) => {
      let desc = `'${c.title}' was submitted by ${c.instructor?.name || "an instructor"}.`;
      if (c.status === "approved") {
        desc = `'${c.title}' by ${c.instructor?.name || "an instructor"} was approved by ${c.approvedBy?.name || "an admin"}.`;
      }

      activities.push({
        id: `crs_${c._id}`,
        type: "course",
        title: c.status === "approved" ? "Course Approved" : "Course Submitted",
        description: desc,
        date: c.createdAt,
      });
    });

    activities.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({ activities: activities.slice(0, 10) });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching activity" });
  }
};

// @route   GET /api/admin/users
// @access  Private (Admin)
export const getUsers = async (req, res) => {
  try {
    const { search, page, limit, role, includeDeleted } = req.query;
    let query = {};

    // By default, hide soft-deleted users from admin lists.
    if (includeDeleted !== "true") {
      query.isDeleted = { $ne: true };
    }

    if (role) query.role = role;

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // If neither page nor limit provided, keep existing behavior (return all results)
    if (page === undefined && limit === undefined) {
      const users = await User.find(query).sort({ createdAt: -1 });
      return res.status(200).json({ users });
    }

    // Parse and validate pagination params
    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;

    const skip = (pageNum - 1) * limitNum;

    const [totalItems, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.status(200).json({
      users,
      pagination: { page: pageNum, limit: limitNum, totalPages, totalItems },
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// @route   PATCH /api/admin/users/:id/block
// @access  Private (Admin)
export const toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't let an admin block themselves easily
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: "Cannot block yourself" });
    }

    // Only a superadmin can block/unblock another admin or superadmin —
    // otherwise any admin could lock every other admin/superadmin out of
    // the platform (blocked users are rejected on every subsequent request).
    if (
      (user.role === "admin" || user.role === "superadmin") &&
      req.user.role !== "superadmin"
    ) {
      return res.status(403).json({
        message:
          "Only a superadmin can block or unblock an admin or superadmin",
      });
    }

    const previousState = user.isBlocked;
    user.isBlocked = !user.isBlocked;
    await user.save();

    // Audit the block/unblock action
    await logAudit({
      action: user.isBlocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
      module: "admin",
      userId: req.user.id,
      targetId: user._id,
      targetModel: "User",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "warn",
      metadata: {
        targetEmail: user.email,
        targetRole: user.role,
        previousState,
      },
    });

    res.status(200).json({
      message: `User ${user.isBlocked ? "blocked" : "unblocked"}`,
      user,
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error blocking user" });
  }
};

const ASSIGNABLE_ROLES = ["student", "instructor", "admin"];

// @route   PATCH /api/admin/users/:id/role
// @access  Private (Admin, Superadmin)
// Unified role-change endpoint — replaces the old separate promote/demote
// actions. 'superadmin' is deliberately not an assignable role here: that
// tier stays untouchable through this endpoint in either direction, and a
// plain admin can't change another admin's role — only a superadmin can.
export const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: "Cannot change your own role" });
    }

    if (user.role === "superadmin") {
      return res
        .status(403)
        .json({ message: "Cannot change a superadmin's role" });
    }

    if (user.role === "admin" && req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmins can change another admin's role" });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Audit role change
    await logAudit({
      action: "USER_ROLE_CHANGED",
      module: "admin",
      userId: req.user.id,
      targetId: user._id,
      targetModel: "User",
      oldValue: { role: previousRole },
      newValue: { role },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "warn",
      metadata: { targetEmail: user.email },
    });

    res.status(200).json({ message: `User's role changed to ${role}`, user });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error changing user role" });
  }
};

// A user can't be suspended/deleted by anyone but a superadmin if they're an
// admin/superadmin themselves, and never by (or targeting) themselves —
// mirrors the existing toggleBlockUser / changeUserRole guards above.
const canModerate = (req, targetUser) => {
  if (!targetUser) return "User not found";
  if (targetUser._id.toString() === req.user.id.toString())
    return "Cannot act on your own account";
  if (targetUser.role === "superadmin") return "Cannot act on a superadmin";
  if (targetUser.role === "admin" && req.user.role !== "superadmin")
    return "Only a superadmin can act on an admin";
  return null;
};

// @route   DELETE /api/admin/users/:id/soft-delete
// @access  Private (Admin)
// Soft delete only — the record stays intact (Enrollment/Course references
// aren't touched) but the user is hidden from admin lists and can't log in.
export const softDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const err = canModerate(req, user);
    if (err) return res.status(user ? 400 : 404).json({ message: err });

    user.isDeleted = true;
    user.isBlocked = true;
    await user.save();

    // Audit soft delete
    await logAudit({
      action: "USER_SOFT_DELETED",
      module: "admin",
      userId: req.user.id,
      targetId: user._id,
      targetModel: "User",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "error",
      metadata: { targetEmail: user.email, targetRole: user.role },
    });

    res.status(200).json({ message: "User deleted", user });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error deleting user" });
  }
};

// @route   PATCH /api/admin/users/:id/restore
// @access  Private (Admin)
export const restoreUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDeleted = false;
    user.isBlocked = false;
    await user.save();

    // Audit restore
    await logAudit({
      action: "USER_RESTORED",
      module: "admin",
      userId: req.user.id,
      targetId: user._id,
      targetModel: "User",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "info",
      metadata: { targetEmail: user.email, targetRole: user.role },
    });

    res.status(200).json({ message: "User restored", user });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error restoring user" });
  }
};

// @route   GET /api/admin/transactions
// @access  Private (Admin)
export const getTransactions = async (req, res) => {
  try {
    const { page, limit } = req.query;

    // If neither page nor limit provided, keep existing behavior
    if (page === undefined && limit === undefined) {
      const enrollments = await Enrollment.find()
        .populate("student", "name email phone")
        .populate({
          path: "course",
          select: "title price instructor",
          populate: { path: "instructor", select: "name" },
        })
        .sort({ createdAt: -1 });

      return res.status(200).json({ transactions: enrollments });
    }

    let pageNum = parseInt(page, 10);
    let limitNum = parseInt(limit, 10);
    if (Number.isNaN(pageNum) || pageNum < 1) pageNum = 1;
    if (Number.isNaN(limitNum) || limitNum < 1) limitNum = 10;
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, enrollments] = await Promise.all([
      Enrollment.countDocuments(),
      Enrollment.find()
        .populate("student", "name email phone")
        .populate({
          path: "course",
          select: "title price instructor",
          populate: { path: "instructor", select: "name" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    res.status(200).json({
      transactions: enrollments,
      pagination: { page: pageNum, limit: limitNum, totalPages, totalItems },
    });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching transactions" });
  }
};

// @route   GET /api/admin/payouts
// @access  Private (Admin)
export const getPendingPayouts = async (req, res) => {
  try {
    const payouts = await Transaction.find({ type: "payout_request" })
      .populate("instructor", "name email phone isProgramInstructor")
      .sort({ createdAt: -1 });

    res.status(200).json({ payouts });
  } catch (error) {
    logger.error("An error occurred", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching payouts" });
  }
};

// @route   GET /api/admin/payouts/:id/revenue-trace
// @access  Private (Admin)
export const getPayoutRevenueTrace = async (req, res) => {
  try {
    const payout = await Transaction.findById(req.params.id);
    if (!payout || payout.type !== "payout_request") {
      return res.status(404).json({ message: "Payout request not found" });
    }

    const instructorId = payout.instructor;

    // Find the previous successful/cleared payout for this instructor
    const lastPayout = await Transaction.findOne({
      instructor: instructorId,
      type: "payout_request",
      status: { $in: ["cleared", "paid"] },
      createdAt: { $lt: payout.createdAt },
    }).sort({ createdAt: -1 });

    const sinceDate = lastPayout ? lastPayout.createdAt : new Date(0);

    // Find all courses owned by this instructor
    const courses = await Course.find({ instructor: instructorId }).select(
      "_id",
    );
    const courseIds = courses.map((c) => c._id);

    // Find all approved enrollments for these courses created since sinceDate up to payout.createdAt
    const enrollments = await Enrollment.find({
      course: { $in: courseIds },
      status: "approved",
      createdAt: { $gte: sinceDate, $lte: payout.createdAt },
    })
      .populate("student", "name email")
      .populate("course", "title price")
      .sort({ createdAt: -1 });

    const totalSum = enrollments.reduce(
      (sum, e) => sum + (e.amountPaid || (e.course && e.course.price) || 0),
      0,
    );

    res.status(200).json({
      enrollments,
      totalSum,
      sinceDate,
      payoutDate: payout.createdAt,
    });
  } catch (error) {
    logger.error("An error occurred in getPayoutRevenueTrace", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching revenue trace" });
  }
};

// @route   GET /api/admin/lessons
// @access  Private (Admin/SuperAdmin)
export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.find()
      .populate({
        path: "module",
        populate: {
          path: "course",
          select: "title instructor status category",
          populate: {
            path: "instructor",
            select: "name email",
          },
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ lessons });
  } catch (error) {
    logger.error("Error fetching lessons:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching lessons" });
  }
};

// @route   PATCH /api/admin/lessons/:id/approve
// @access  Private (Admin/SuperAdmin)
export const approveLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    );
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.status(200).json({ message: "Lesson approved", lesson });
  } catch (error) {
    logger.error("Error approving lesson:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error approving lesson" });
  }
};

// @route   PATCH /api/admin/lessons/:id/reject
// @access  Private (Admin/SuperAdmin)
export const rejectLesson = async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    res.status(200).json({ message: "Lesson rejected", lesson });
  } catch (error) {
    logger.error("Error rejecting lesson:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error rejecting lesson" });
  }
};

// @route   DELETE /api/admin/lessons/:id
// @access  Private (Admin/SuperAdmin)
export const deleteLessonAdmin = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate("module");
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });
    const moduleId = lesson.module?._id;
    await lesson.deleteOne();
    if (moduleId) {
      const remaining = await Lesson.find({ module: moduleId }).sort({ order: 1 });
      for (let i = 0; i < remaining.length; i++) {
        remaining[i].order = i + 1;
        await remaining[i].save();
      }
    }
    res.status(200).json({ message: "Lesson deleted successfully" });
  } catch (error) {
    logger.error("Error deleting lesson:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error deleting lesson" });
  }
};

// @route   POST /api/admin/enroll
// @access  Private (Admin/SuperAdmin)
// Manually enrolls a student in a course (e.g. comping access, resolving a
// support ticket). No money changes hands, so the financial fields stay 0
// rather than reusing the paid-enrollment commission-split logic.
export const manualEnroll = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res
        .status(400)
        .json({ message: "studentId and courseId are required" });
    }

    const [student, course] = await Promise.all([
      User.findById(studentId),
      Course.findById(courseId),
    ]);

    if (!student || student.role !== "student") {
      return res.status(404).json({ message: "Student not found" });
    }
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      amountPaid: 0,
      platformCommission: 0,
      instructorShare: 0,
    });

    await logAudit({
      action: "MANUAL_ENROLLMENT",
      module: "admin",
      userId: req.user.id,
      targetId: enrollment._id,
      targetModel: "Enrollment",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "info",
      metadata: { studentEmail: student.email, courseTitle: course.title },
    });

    res.status(201).json({ message: "Student manually enrolled", enrollment });
  } catch (error) {
    // Duplicate-key error (code 11000): the unique student+course index
    // caught it — same friendly message as the student-facing enroll route.
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "Student is already enrolled in this course" });
    }
    logger.error("Error manually enrolling student:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error enrolling student" });
  }
};

// @route   POST /api/admin/promo-codes
// @access  Private (Admin/SuperAdmin) — issues an affiliate/promo code
// (ADM-13) tied to a specific (typically non-program) instructor.
export const createPromoCode = async (req, res) => {
  try {
    const { code, instructorId } = req.body;
    if (!code || !instructorId) {
      return res
        .status(400)
        .json({ message: "code and instructorId are required" });
    }

    const instructor = await User.findById(instructorId);
    if (!instructor || instructor.role !== "instructor") {
      return res.status(404).json({ message: "Instructor not found" });
    }

    const promo = await PromoCode.create({
      code: code.toUpperCase().trim(),
      instructor: instructorId,
    });
    res.status(201).json({ message: "Promo code created", promo });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "That promo code already exists" });
    }
    logger.error("Error creating promo code:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error creating promo code" });
  }
};

// @route   GET /api/admin/promo-codes
// @access  Private (Admin/SuperAdmin)
export const getPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find()
      .populate("instructor", "name email isProgramInstructor")
      .sort({ createdAt: -1 });
    res.status(200).json({ promoCodes });
  } catch (error) {
    logger.error("Error fetching promo codes:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error fetching promo codes" });
  }
};

// @route   PATCH /api/admin/promo-codes/:id/toggle
// @access  Private (Admin/SuperAdmin)
export const togglePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" });
    }

    promo.active = !promo.active;
    await promo.save();

    res.status(200).json({
      message: `Promo code ${promo.active ? "activated" : "deactivated"}`,
      promo,
    });
  } catch (error) {
    logger.error("Error toggling promo code:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error toggling promo code" });
  }
};

export const toggleProgramInstructor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "instructor") {
      return res
        .status(400)
        .json({ message: "Only instructors can be program instructors" });
    }

    user.isProgramInstructor = !user.isProgramInstructor;
    await user.save();

    await logAudit({
      action: user.isProgramInstructor
        ? "PROGRAM_INSTRUCTOR_ADDED"
        : "PROGRAM_INSTRUCTOR_REMOVED",
      module: "admin",
      userId: req.user.id,
      targetId: user._id,
      targetModel: "User",
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      severity: "warn",
      metadata: { targetEmail: user.email },
    });

    res.json({
      message: `Instructor ${user.isProgramInstructor ? "added to" : "removed from"} program`,
      user,
    });
  } catch (error) {
    logger.error("Error toggling program instructor:", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   PATCH /api/admin/enrollments/:id/approve
// @access  Private (Admin/SuperAdmin)
export const approveEnrollment = async (req, res) => {
  try {
    // Atomic find-and-update on status: 'pending' closes the race window
    // between two concurrent approve calls (e.g. a double-click) — only the
    // first one can ever flip status away from 'pending', so at most one
    // revenue-split Transaction is ever created per enrollment.
    const enrollment = await Enrollment.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "approved" },
      { new: true },
    );
    if (!enrollment) {
      const existing = await Enrollment.findById(req.params.id);
      if (!existing)
        return res
          .status(404)
          .json({ message: "Enrollment request not found" });
      return res
        .status(409)
        .json({ message: `Enrollment request already ${existing.status}` });
    }

    // Generate revenue split transaction for the instructor (if course has price)
    const course = await Course.findById(enrollment.course);
    if (course && course.price > 0 && course.instructor) {
      let platformCommission = enrollment.platformCommission;
      let instructorShare = enrollment.instructorShare;
      let commissionPercent = 15;

      const instructor = await User.findById(course.instructor);
      if (instructor && instructor.isProgramInstructor) {
        commissionPercent = 15;
      } else {
        commissionPercent =
          Math.round((platformCommission / course.price) * 100) || 15;
      }

      await Transaction.create({
        instructor: course.instructor,
        amount: instructorShare,
        type: "course_sale",
        status: "pending",
        availableAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day settlement
        description: `Course Sale - ${course.title}`,
        course: course._id,
        commissionRate: commissionPercent,
        referenceId:
          enrollment.invoiceId ||
          enrollment.transactionId ||
          "INV-" + enrollment._id.toString().slice(-8).toUpperCase(),
      });
    }

    // Remove the admin-side enrollment request notifications
    await Notification.deleteMany({
      refId: enrollment._id,
      title: "New Enrollment Request",
    });

    // Notify the student
    await Notification.create({
      user: enrollment.student,
      title: "Enrollment Request Approved",
      message: `Your enrollment request for "${course?.title || "Course"}" has been approved! You can start learning now.`,
      type: "system",
      link: `/learn/${enrollment.course}`,
    });

    try {
      const student = await User.findById(enrollment.student).select(
        "name email",
      );
      const instructor = course.instructor
        ? await User.findById(course.instructor).select("name")
        : null;
      if (student && student.email) {
        await emailService.sendStudentEnrollApprovedEmail({
          toEmail: student.email,
          student_name: student.name || "Student",
          course_title: course?.title || "Course",
          instructor_name: instructor?.name || "Instructor",
          enrollment_date: new Date().toLocaleDateString(),
          course_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/learn/${enrollment.course}`,
          help_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/help`,
          settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/student/settings`,
        });
      }
    } catch (err) {
      logger.error("Failed to send enrollment approval email", {
        err: err.message,
      });
    }

    res
      .status(200)
      .json({ message: "Enrollment request approved", enrollment });
  } catch (error) {
    logger.error("Error approving enrollment", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error approving enrollment" });
  }
};

// @route   PATCH /api/admin/enrollments/:id/reject
// @access  Private (Admin/SuperAdmin)
export const rejectEnrollment = async (req, res) => {
  try {
    const { reason } = req.body;
    // Same atomic guard as approveEnrollment — see comment there.
    const enrollment = await Enrollment.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { status: "rejected", rejectionReason: reason || "" },
      { new: true },
    );
    if (!enrollment) {
      const existing = await Enrollment.findById(req.params.id);
      if (!existing)
        return res
          .status(404)
          .json({ message: "Enrollment request not found" });
      return res
        .status(409)
        .json({ message: `Enrollment request already ${existing.status}` });
    }

    await enrollment.populate("course");

    // Remove the admin-side enrollment request notifications
    await Notification.deleteMany({
      refId: enrollment._id,
      title: "New Enrollment Request",
    });

    // Notify the student
    await Notification.create({
      user: enrollment.student,
      title: "Enrollment Request Rejected",
      message: `Your enrollment request for "${enrollment.course?.title || "Course"}" was rejected. Reason: ${reason || "No reason provided."}`,
      type: "system",
      link: `/courses/${enrollment.course?._id || enrollment.course}`,
    });

    try {
      const student = await User.findById(enrollment.student).select(
        "name email",
      );
      if (student && student.email) {
        await emailService.sendStudentEnrollRejectedEmail({
          toEmail: student.email,
          student_name: student.name || "Student",
          course_title: enrollment.course?.title || "Course",
          rejection_reason: reason || "Does not meet criteria.",
          review_date: new Date().toLocaleDateString(),
          browse_courses_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/courses`,
          help_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/help`,
          settings_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/student/settings`,
        });
      }
    } catch (err) {
      logger.error("Failed to send enrollment rejection email", {
        err: err.message,
      });
    }

    res
      .status(200)
      .json({ message: "Enrollment request rejected", enrollment });
  } catch (error) {
    logger.error("Error rejecting enrollment", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error rejecting enrollment" });
  }
};

// @route   GET /api/admin/instructor-violations?instructorId=
// @access  Private (admin/superadmin)
// System-generated abandoned-Ongoing-Course events (spec §10). Read-only
// visibility for admins deciding whether to act (e.g. block the instructor
// via the existing PATCH /users/:id/block) — this endpoint never suspends
// anyone itself.
export const getInstructorViolations = async (req, res) => {
  try {
    const { instructorId } = req.query;
    const filter = instructorId ? { instructor: instructorId } : {};

    const violations = await InstructorViolation.find(filter)
      .populate("instructor", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({ violations });
  } catch (error) {
    logger.error("Error fetching instructor violations", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching instructor violations" });
  }
};

// @route   GET /api/admin/instructor-violations/summary
// @access  Private (admin/superadmin)
// Per-instructor violation counts, for a compact badge in the user list —
// avoids the admin UI fetching the full violation list just to show a count.
export const getInstructorViolationSummary = async (req, res) => {
  try {
    const summary = await InstructorViolation.aggregate([
      { $sort: { createdAt: 1 } }, // ascending so $last below is truly the most recent
      {
        $group: {
          _id: "$instructor",
          count: { $sum: 1 },
          latestStage: { $last: "$stage" },
        },
      },
    ]);
    res.status(200).json({
      summary: summary.map((s) => ({
        instructorId: s._id,
        count: s.count,
        latestStage: s.latestStage,
      })),
    });
  } catch (error) {
    logger.error("Error fetching instructor violation summary", {
      error: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ message: "Server error fetching instructor violation summary" });
  }
};
