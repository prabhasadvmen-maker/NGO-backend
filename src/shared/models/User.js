import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'user'],
      default: 'user',
    },
    isActive:      { type: Boolean, default: true },
    lastLogin:     { type: Date,    default: null },
    loginAttempts: { type: Number,  default: 0 },
    lockUntil:     { type: Date,    default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
};

userSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

const User = mongoose.model('User', userSchema);
export default User;
