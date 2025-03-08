const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate } = require('./plugins');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 */
const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: [validator.isEmail, 'Invalid email'],
    },
    password: {
      type: String,
      trim: true,
      minlength: 8,
      validate: {
        validator: function (value) {
          return !value || (/\d/.test(value) && /[a-zA-Z]/.test(value));
        },
        message: 'Password must contain at least one letter and one number',
      },
    },
    dob: { type: Date, required: true },
    role: {
      type: String,
      enum: ['member', 'trainer', 'admin'],
      default: 'member',
    },
    otp: {
      type: String,
      trim: true,
    },
    otpExpires: {
      type: Date,
    },    
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);
userSchema.plugin(toJSON);
userSchema.plugin(paginate);
/**
 * Check if email is taken (Exclude the user if provided)
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Compare password for authentication
 * @param {string} enteredPassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = bcrypt.hashSync(this.password, 10);
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
