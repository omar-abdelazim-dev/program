import crypto from 'crypto';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const PAYOUT_COOLDOWN_DAYS = 7;
const PAYOUT_OTP_EXPIRY_MINUTES = 10;
const PAYOUT_METHODS = ['vodafone_cash', 'orange_cash', 'etisalat_cash', 'we_cash', 'instapay'];

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
                $or: [
                  { 
                    $and: [
                      { $eq: ['$type', 'course_sale'] }, 
                      {
                        $or: [
                          { $lte: ['$availableAt', new Date()] },
                          { $eq: [{ $ifNull: ['$availableAt', null] }, null] }
                        ]
                      }
                    ] 
                  },
                  { $and: [{ $eq: ['$type', 'payout_request'] }, { $in: ['$status', ['otp_verified', 'approved', 'processing', 'paid', 'cleared']] }] }
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

// Helper to compute pending balance (sales within 7-day settlement period)
const getPendingBalance = async (instructorId) => {
  const result = await Transaction.aggregate([
    { 
      $match: { 
        instructor: instructorId, 
        type: 'course_sale', 
        availableAt: { $gt: new Date() } 
      } 
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
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
    const pendingBalance = await getPendingBalance(instructorId);
    
    const transactions = await Transaction.find({ 
      instructor: instructorId,
      status: { $ne: 'pending' }
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      availableBalance,
      pendingBalance,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ message: 'Failed to fetch financials' });
  }
};

// @desc    Send a one-time verification code before a payout can be requested
// @route   POST /api/financials/payout/otp
// @access  Private/Instructor
export const requestPayoutOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const registeredPhone = user?.phone || 'registered phone number';

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await User.findByIdAndUpdate(req.user.id, {
      payoutOtpHash: otpHash,
      payoutOtpExpires: Date.now() + PAYOUT_OTP_EXPIRY_MINUTES * 60 * 1000,
    });

    // Send code to registered account phone by default
    logger.info(`Payout OTP generated for instructor ${req.user.id} (${registeredPhone})`, { otp, phone: registeredPhone, expiresInMinutes: PAYOUT_OTP_EXPIRY_MINUTES });

    res.status(200).json({ message: `Verification code sent to your registered phone number (${registeredPhone})`, phone: registeredPhone });
  } catch (error) {
    console.error('Error requesting payout OTP:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
};

// @desc    Request a payout
// @route   POST /api/financials/payout
// @access  Private/Instructor
export const requestPayout = async (req, res) => {
  try {
    const { method, payoutDetails, payoutEmail } = req.body;

    if (!PAYOUT_METHODS.includes(method)) {
      return res.status(400).json({ message: 'Invalid payout method' });
    }

    const emailTrimmed = payoutEmail ? payoutEmail.toLowerCase().trim() : req.user.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      return res.status(400).json({ message: 'Invalid email address format' });
    }

    const instructorId = new mongoose.Types.ObjectId(req.user.id);

    // Cancel any abandoned 'pending' (unverified) requests so they don't lock the balance
    await Transaction.updateMany(
      { instructor: instructorId, type: 'payout_request', status: 'pending' },
      { $set: { status: 'failed', failureReason: 'Abandoned (New request initiated before OTP verification)' } }
    );

    // Cooldown check: get the most recent payout request
    const lastPayout = await Transaction.findOne({ 
      instructor: instructorId, 
      type: 'payout_request',
    }).sort({ createdAt: -1 });
    
    if (lastPayout) {
      // If it's still being processed, block a new request regardless of date
      if (['otp_verified', 'approved', 'processing', 'pending'].includes(lastPayout.status)) {
         return res.status(429).json({ message: 'You already have a payout request being processed.' });
      }
      
      if (['cleared', 'paid'].includes(lastPayout.status)) {
        const approvalDate = lastPayout.updatedAt || lastPayout.approvedAt || lastPayout.createdAt;
        const cooldownEnds = new Date(new Date(approvalDate).getTime() + PAYOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        if (cooldownEnds > new Date()) {
          return res.status(429).json({ message: `You can request another payout starting ${cooldownEnds.toDateString()}` });
        }
      }
      // If lastPayout is 'rejected' or 'failed', allow immediate re-request
    }

    const availableBalance = await getAvailableBalance(instructorId);

    if (availableBalance < 100) {
      return res.status(400).json({ message: 'Available balance must be at least EGP 100 to request a payout' });
    }
    
    const amount = availableBalance;
    const expectedFees = amount * 0.02;
    const expectedPayout = amount - expectedFees;
    
    // Auto-calculate requiresSecondApproval
    const APPROVAL_THRESHOLD = parseFloat(process.env.PAYOUT_APPROVAL_THRESHOLD || '5000');
    const requiresSecondApproval = amount >= APPROVAL_THRESHOLD;

    // Auto-generate UUID or unique token for idempotencyKey and referenceId
    const refId = req.body.referenceId || `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const idempotencyKey = crypto.randomUUID();

    const payoutTx = await Transaction.create({
      instructor: instructorId,
      amount: -Math.abs(amount), // Payouts are always deductions
      type: 'payout_request',
      status: 'pending',
      description: `Payout Request - ${method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      payoutMethod: method,
      payoutDetails: payoutDetails,
      payoutEmail: emailTrimmed,
      requiresSecondApproval,
      idempotencyKey,
      expectedFees,
      expectedPayout,
      referenceId: refId
    });

    res.status(201).json({ message: 'Payout request initiated successfully. Please complete email OTP verification.', transaction: payoutTx });
  } catch (error) {
    console.error('Error requesting payout:', error);
    res.status(500).json({ message: 'Failed to request payout' });
  }
};

// @desc    Admin: Mark payout as cleared and erase sensitive details
// @route   PUT /api/financials/:id/complete
// @access  Private/Admin
export const completePayout = async (req, res) => {
  try {
    const { actualFee, actualPayout, providerTransactionId } = req.body;
    const tx = await Transaction.findById(req.params.id).populate('instructor', 'name email');
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    if (tx.status === 'paid') {
      return res.status(400).json({ message: 'Payout is already paid' });
    }

    tx.status = 'paid';
    tx.payoutDetails = ''; // Erase sensitive bank account / phone number data for security

    if (actualFee !== undefined) tx.actualFee = actualFee;
    if (actualPayout !== undefined) tx.actualPayout = actualPayout;
    if (providerTransactionId !== undefined) tx.providerTransactionId = providerTransactionId;

    await tx.save();

    if (tx.instructor && tx.instructor.email) {
      try {
        const { default: PayoutOTP } = await import('../models/PayoutOTP.js');
        const otpRecord = await PayoutOTP.findOne({ payoutRequestId: tx._id }).sort({ createdAt: -1 });
        const targetEmail = otpRecord?.email || tx.instructor.email;

        const { sendPayoutStatusEmail } = await import('../utils/payoutOtp.js');
        await sendPayoutStatusEmail({
          toEmail: targetEmail,
          instructorName: tx.instructor.name || 'Instructor',
          status: 'approved'
        });
      } catch (err) {
        console.error('Failed to send payout approval email:', err);
      }
    }

    res.json({ message: 'Payout marked as completed and sensitive data wiped', transaction: tx });
  } catch (error) {
    console.error('Error completing payout:', error);
    res.status(500).json({ message: 'Failed to complete payout' });
  }
};


// @desc    Admin: Mark payout as processing
// @route   PUT /api/financials/:id/process
// @access  Private/Admin
export const processPayout = async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    if (tx.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending payouts can be processed' });
    }

    tx.status = 'processing';
    await tx.save();

    res.json({ message: 'Payout marked as processing', transaction: tx });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({ message: 'Failed to mark payout as processing' });
  }
};

// @desc    Admin: Mark payout as rejected
// @route   PUT /api/financials/:id/reject
// @access  Private/Admin
export const rejectPayout = async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findById(req.params.id).populate('instructor', 'name email');
    if (!tx || tx.type !== 'payout_request') {
      return res.status(404).json({ message: 'Payout request not found' });
    }

    if (tx.status === 'paid' || tx.status === 'rejected') {
      return res.status(400).json({ message: 'Payout is already processed' });
    }

    tx.status = 'rejected';
    tx.rejectionReason = reason || 'Payout request was rejected by administration.';

    await tx.save();

    if (tx.instructor && tx.instructor.email) {
      try {
        const { default: PayoutOTP } = await import('../models/PayoutOTP.js');
        const otpRecord = await PayoutOTP.findOne({ payoutRequestId: tx._id }).sort({ createdAt: -1 });
        const targetEmail = otpRecord?.email || tx.instructor.email;

        const { sendPayoutStatusEmail } = await import('../utils/payoutOtp.js');
        await sendPayoutStatusEmail({
          toEmail: targetEmail,
          instructorName: tx.instructor.name || 'Instructor',
          status: 'rejected',
          reason: tx.rejectionReason
        });
      } catch (err) {
        console.error('Failed to send payout rejection email:', err);
      }
    }

    res.json({ message: 'Payout rejected', transaction: tx });
  } catch (error) {
    console.error('Error rejecting payout:', error);
    res.status(500).json({ message: 'Failed to reject payout' });
  }
};
