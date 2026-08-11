import Report from '../models/Report.js';
import { logAudit } from '../utils/auditLogger.js';
import logger from '../utils/logger.js';

// @route   POST /api/reports
// @access  Private/Student
export const createReport = async (req, res) => {
  try {
    const { category, description, courseId } = req.body;

    if (!category || !description) {
      return res.status(400).json({ message: 'Category and description are required' });
    }

    const report = await Report.create({
      student: req.user.id,
      category,
      description,
      course: courseId || null,
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    logger.error('Error creating report:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to submit report' });
  }
};

// @route   GET /api/reports
// @access  Private/Admin
export const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('student', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    res.status(200).json({ reports });
  } catch (error) {
    logger.error('Error fetching reports:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// @route   PATCH /api/reports/:id/resolve
// @access  Private/Admin
export const resolveReport = async (req, res) => {
  try {
    const { status } = req.body;
    const targetStatus = ['resolved', 'dismissed'].includes(status) ? status : 'resolved';

    const report = await Report.findByIdAndUpdate(req.params.id, { status: targetStatus }, { new: true });
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    await logAudit({
      action: targetStatus === 'resolved' ? 'REPORT_RESOLVED' : 'REPORT_DISMISSED',
      module: 'admin',
      userId: req.user.id,
      targetId: report._id,
      targetModel: 'Report',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      severity: 'info',
    });

    res.status(200).json({ message: 'Report updated', report });
  } catch (error) {
    logger.error('Error resolving report:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to update report' });
  }
};
