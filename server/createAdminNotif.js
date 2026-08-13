import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/User.js';
import Notification from './models/Notification.js';

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
  console.log('Found admins count:', admins.length);
  for (const admin of admins) {
    await Notification.create({
      user: admin._id,
      title: 'New Payout Request',
      message: 'Instructor instructor has submitted a payout request of EGP 285,460.00.',
      type: 'system',
      link: '/admin'
    });
    console.log('✅ Created notification for admin:', admin.email);
  }
  await mongoose.disconnect();
})();
