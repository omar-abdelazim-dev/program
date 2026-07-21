import fs from 'fs';
import path from 'path';

const controllerPath = 'C:/Users/ahmad/Desktop/program-week2/server/controllers/adminController.js';
let content = fs.readFileSync(controllerPath, 'utf8');

const getPendingPayoutsCode = `
// @route   GET /api/admin/payouts
// @access  Private (Admin)
export const getPendingPayouts = async (req, res) => {
  try {
    const payouts = await Transaction.find({ type: 'payout_request' })
      .populate('instructor', 'name email phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ payouts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching payouts' });
  }
};
`;

if (!content.includes('export const getPendingPayouts')) {
  // We need to import Transaction if it's not imported.
  if (!content.includes("import Transaction from '../models/Transaction.js'")) {
    content = "import Transaction from '../models/Transaction.js';\n" + content;
  }
  
  content += '\n' + getPendingPayoutsCode;
  fs.writeFileSync(controllerPath, content);
  console.log('Added getPendingPayouts to adminController.js');
}

const routesPath = 'C:/Users/ahmad/Desktop/program-week2/server/routes/adminRoutes.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');

if (!routesContent.includes('getPendingPayouts')) {
  routesContent = routesContent.replace(
    'restoreUser, getTransactions',
    'restoreUser, getTransactions, getPendingPayouts'
  );
  routesContent = routesContent.replace(
    "router.get('/transactions', getTransactions);",
    "router.get('/transactions', getTransactions);\nrouter.get('/payouts', getPendingPayouts);"
  );
  fs.writeFileSync(routesPath, routesContent);
  console.log('Added /payouts route to adminRoutes.js');
}
