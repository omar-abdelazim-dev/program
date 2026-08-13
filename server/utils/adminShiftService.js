import User from '../models/User.js';

/**
 * Returns the currently active shift admin to receive immediate email notification.
 * Uses 4-hour shift rotation blocks across available system admins.
 */
export const getActiveShiftAdmin = async () => {
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 });
    if (!admins || admins.length === 0) {
      return null;
    }

    const currentHour = new Date().getHours();
    const shiftBlock = Math.floor(currentHour / 4); // 6 blocks per day (0-5)
    const adminIndex = shiftBlock % admins.length;

    return admins[adminIndex];
  } catch (error) {
    console.error('Error calculating active shift admin:', error);
    return null;
  }
};
