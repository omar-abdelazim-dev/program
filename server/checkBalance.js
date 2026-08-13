import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/User.js';
import Transaction from './models/Transaction.js';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const u = await User.findOne({ email: 'instructor@gmail.com' });
  const instructorId = u._id;
  
  const pendingSales = await Transaction.find({
    instructor: instructorId,
    type: 'course_sale',
    availableAt: { $gt: new Date() }
  });

  console.log('Pending sales count:', pendingSales.length);
  
  const allSales = await Transaction.find({
    instructor: instructorId,
    type: 'course_sale'
  });
  
  console.log('All sales count:', allSales.length);
  allSales.forEach(s => console.log(s._id, 'EGP', s.amount, 'status:', s.status, 'availableAt:', s.availableAt, 'now:', new Date()));
  
  await mongoose.disconnect();
})();
