const mongoose = require('mongoose');
const validator = require('validator');
const { toJSON, paginate } = require('./plugins');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 */
const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
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
    profilePhoto: {
      type: String,
      default: 'https://ui-avatars.com/api/?name=John+Doe&background=random',
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


userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};


userSchema.methods.isPasswordMatch = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};


userSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


userSchema.pre('save', async function (next) {
  if (!this.otp || !this.isModified('otp')) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});


userSchema.methods.isOtpMatch = async function (enteredOtp) {
  return bcrypt.compare(enteredOtp, this.otp);
};


userSchema.pre('save', async function (next) {
  if (this.otpExpires && new Date() > this.otpExpires) {
    this.otp = undefined;
    this.otpExpires = undefined;
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
