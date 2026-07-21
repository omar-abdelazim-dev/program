import fs from 'fs';

const controllerPath = 'C:/Users/ahmad/Desktop/program-week2/server/controllers/financialController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const rejectPayoutCode = `
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
`;

if (!content.includes('export const rejectPayout')) {
  content += '\n' + rejectPayoutCode;
  fs.writeFileSync(controllerPath, content);
  console.log('Added rejectPayout to financialController.js');
}

const routesPath = 'C:/Users/ahmad/Desktop/program-week2/server/routes/financialRoutes.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');

if (!routesContent.includes('rejectPayout')) {
  routesContent = routesContent.replace(
    'import { getFinancials, requestPayout, completePayout }',
    'import { getFinancials, requestPayout, completePayout, rejectPayout }'
  );
  routesContent += "\nrouter.put('/:id/reject', protect, authorize('admin', 'superadmin'), rejectPayout);\n";
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added /reject route to financialRoutes.js');
}
