import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // Never return password field by default on queries.
    },
    role: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      default: 'student',
    },
  },
  { timestamps: true }
);

// Runs automatically before a user document is saved.
// We hash the password here (not in the controller) so it's IMPOSSIBLE to
// accidentally save a plaintext password no matter where in the app you call
// User.save() from — the safety lives with the model, not the caller.
userSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually changed
  // (otherwise updating a user's name would re-hash their already-hashed password).
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare a plaintext password (from login form) against
// the hashed password stored in the DB. Returns true/false.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
