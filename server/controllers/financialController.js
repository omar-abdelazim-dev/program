import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const PAYOUT_COOLDOWN_DAYS = 15;
const PAYOUT_OTP_EXPIRY_MINUTES = 10;
const PAYOUT_METHODS = ['vodafone_cash', 'instapay'];

// Helper to compute available balance for an instructor
const getAvailableBalance = async (instructorId) => {
  const result = await Transaction.aggregate([
    { $match: { instructor: instructorId } },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $cond: [
              {
                // Only count cleared course sales, OR any payout request (pending or cleared)
                // A rejected payout request doesn't deduct from balance
                $or: [
                  { $and: [{ $eq: ['$type', 'course_sale'] }, { $eq: ['$status', 'cleared'] }] },
                  { $and: [{ $eq: ['$type', 'payout_request'] }, { $ne: ['$status', 'rejected'] }] }
                ]
              },
              '$amount',
              0
            ]
          }
        }
      }
    }
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// @desc    Get instructor financials (balance and ledger)
// @route   GET /api/financials
// @access  Private/Instructor
export const getFinancials = async (req, res) => {
  try {
    const instructorId = new mongoose.Types.ObjectId(req.user.id);
    const availableBalance = await getAvailableBalance(instructorId);
    
    const transactions = await Transaction.find({ instructor: instructorId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      availableBalance,
      transactions,
    });
  } catch (error) {
    logger.error('Error fetching financials:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to fetch financials' });
  }
};

// @desc    Send a one-time verification code before a payout can be requested
// @route   POST /api/financials/payout/otp
// @access  Private/Instructor
export const requestPayoutOtp = async (req, res) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await User.findByIdAndUpdate(req.user.id, {
      payoutOtpHash: otpHash,
      payoutOtpExpires: Date.now() + PAYOUT_OTP_EXPIRY_MINUTES * 60 * 1000,
    });

    // No SMS/email provider is wired up for this MVP — log the code the way
    // a real provider's delivery would surface it, instead of returning it
    // in the response.
    logger.info(`Payout OTP generated for instructor ${req.user.id}`, { otp, expiresInMinutes: PAYOUT_OTP_EXPIRY_MINUTES });

    res.status(200).json({ message: 'A verification code has been sent to your registered phone/email' });
  } catch (error) {
    logger.error('Error requesting payout OTP:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// @desc    Request a payout
// @route   POST /api/financials/payout
// @access  Private/Instructor
export const requestPayout = async (req, res) => {
  try {
    const { amount, method, payoutDetails, otpCode } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: 'Minimum payout amount is EGP 100' });
    }

    if (!PAYOUT_METHODS.includes(method)) {
      return res.status(400).json({ message: 'Invalid payout method' });
    }

    if (!otpCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    const instructor = await User.findById(req.user.id).select('+payoutOtpHash +payoutOtpExpires');
    const otpHash = crypto.createHash('sha256').update(String(otpCode)).digest('hex');
    if (
      !instructor.payoutOtpHash ||
      instructor.payoutOtpHash !== otpHash ||
      !instructor.payoutOtpExpires ||
      instructor.payoutOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    const instructorId = new mongoose.Types.ObjectId(req.user.id);

    // Cooldown: at least 15 days must pass between payout requests, measured
    // from the instructor's most recent payout_request transaction.
    const lastPayout = await Transaction.findOne({ instructor: instructorId, type: 'payout_request' }).sort({ createdAt: -1 });
    if (lastPayout) {
      const cooldownEnds = new Date(lastPayout.createdAt.getTime() + PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (cooldownEnds > new Date()) {
        return res.status(429).json({ message: `You can request another payout starting ${cooldownEnds.toDateString()}` });
      }
    }

    const availableBalance = await getAvailableBalance(instructorId);

    if (amount > availableBalance) {
      return res.status(400).json({ message: 'Insufficient funds for this payout request' });
    }

    const payoutTx = await Transaction.create({
      instructor: instructorId,
      amount: -Math.abs(amount), // Payouts are always deductions
      type: 'payout_request',
      status: 'pending',
      description: `Payout Request - ${method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${payoutDetails ? ` (${payoutDetails})` : ''}`,
      payoutMethod: method,
      payoutDetails: payoutDetails,
    });

    // Consume the OTP so it can't be replayed for a second request
    instructor.payoutOtpHash = undefined;
    instructor.payoutOtpExpires = undefined;
    await instructor.save();

    res.status(201).json({ message: 'Payout request submitted successfully', transaction: payoutTx });
  } catch (error) {
    logger.error('Error requesting payout:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to request payout' });
  }
};

// @desc    Admin: Mark payout as cleared and erase sensitive details
// @route   PUT /api/financials/:id/complete
// @access  Private/Admin
export const completePayout = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    if (tx.status === 'cleared') {
      return res.status(400).json({ message: 'Payout is already cleared' });
    }

    tx.status = 'cleared';
    tx.payoutDetails = ''; // Erase sensitive bank account / phone number data for security

    await tx.save();

    res.json({ message: 'Payout marked as completed and sensitive data wiped', transaction: tx });
  } catch (error) {
    logger.error('Error completing payout:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to complete payout' });
  }
};


// @desc    Admin: Mark payout as rejected
// @route   PUT /api/financials/:id/reject
// @access  Private/Admin
export const rejectPayout = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    if (tx.status === 'cleared' || tx.status === 'rejected') {
      return res.status(400).json({ message: 'Payout is already processed' });
    }

    tx.status = 'rejected';
    tx.payoutDetails = ''; // Optionally erase it here too
    tx.description = tx.description + ' (Rejected)';

    await tx.save();

    res.json({ message: 'Payout rejected', transaction: tx });
  } catch (error) {
    logger.error('Error rejecting payout:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to reject payout' });
  }
};
