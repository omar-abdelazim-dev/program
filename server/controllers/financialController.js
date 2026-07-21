import Transaction from '../models/Transaction.js';
import mongoose from 'mongoose';

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
    console.error('Error fetching financials:', error);
    res.status(500).json({ message: 'Failed to fetch financials' });
  }
};

// @desc    Request a payout
// @route   POST /api/financials/payout
// @access  Private/Instructor
export const requestPayout = async (req, res) => {
  try {
    const { amount, method, payoutDetails } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: 'Minimum payout amount is EGP 100' });
    }

    if (!['bank_transfer', 'vodafone_cash', 'instapay'].includes(method)) {
      return res.status(400).json({ message: 'Invalid payout method' });
    }

    const instructorId = new mongoose.Types.ObjectId(req.user.id);
    const availableBalance = await getAvailableBalance(instructorId);

    if (amount > availableBalance) {
      return res.status(400).json({ message: 'Insufficient funds for this payout request' });
    }

    const payoutTx = await Transaction.create({
      instructor: instructorId,
      amount: -Math.abs(amount), // Payouts are always deductions
      type: 'payout_request',
      status: 'pending',
      description: `Payout Request - ${method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}${(method === 'vodafone_cash' || method === 'instapay' || method === 'bank_transfer') && payoutDetails ? ` (${payoutDetails})` : ''}`,
      payoutMethod: method,
      payoutDetails: payoutDetails,
    });

    res.status(201).json({ message: 'Payout request submitted successfully', transaction: payoutTx });
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
    console.error('Error completing payout:', error);
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
    console.error('Error rejecting payout:', error);
    res.status(500).json({ message: 'Failed to reject payout' });
  }
};
