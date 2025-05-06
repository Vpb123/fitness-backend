const { status } = require("http-status");
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const ApiError = require('../utils/ApiError');
const { Trainer } = require('../models');
const { Member } = require('../models');
const { Admin } = require("../models");
const { createNotification } = require('../services/notification.service');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const otp = await tokenService.saveOTP(user.id);
  await emailService.sendSignupOTPEmail(user.email, otp); 
  res.status(status.CREATED).json({ message: 'OTP sent to email for verification' });
});


const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(status.NO_CONTENT).send();
});


const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'No user found with this email');
  }
  const otp = await tokenService.saveOTP(user.id);
  await emailService.sendResetPasswordOTPEmail(user.email, otp); 
  res.json({ message: 'OTP sent to email for password reset' });
});


const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.email, req.body.password);
  res.status(status.NO_CONTENT).send();
});


const socialLogin = catchAsync(async (req, res) => {
  const user = req.user;
  const adminUser = await userService.findOne({ role: 'admin' });
  if (user.role === 'trainer') {
      const trainer = await Trainer.findOne({ userId: user._id });
      user.roleId = trainer?._id;     

  } else if (user.role === 'member') {
      const member = await Member.findOne({ userId: user._id });
      user.roleId = member?._id;
  } else if (user.role === 'admin') {
      const admin = await Admin.findOne({ userId: user._id });
      user.roleId = admin?._id;
  }

  const tokens = await tokenService.generateAuthTokens(user);
  await createNotification({
    userId:adminUser._id ,
    message: `Pending Approval for ${user.firstName}.`,
    type: 'pending_approval',
  });
  const frontendURL = `${process.env.FRONTEND_URL}/auth/social-auth-callback?token=${tokens.access.token}&user=${encodeURIComponent(JSON.stringify(user))}`;
  res.redirect(frontendURL);
});


const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp, type } = req.body;
  const user = await userService.getUserByEmail(email);
  const adminUser = await userService.findOne({ role: 'admin' });
  if (!user || !(await user.isOtpMatch(otp)) || new Date() > user.otpExpires) {
    throw new ApiError(status.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  await userService.updateUserById(user.id, { otp: null, otpExpires: null });
   await createNotification({
      userId:adminUser._id ,
      message: `Pending Approval for ${user.firstName}.`,
      type: 'pending_approval',
    });
  
  if (type === 'signup') {
    await userService.updateUserById(user.id, { isEmailVerified: true });

    return res.json({ message: 'Email verified successfully' });
  }

  if (type === 'reset-password') {
    return res.json({ message: 'OTP verified, redirect to reset-password' });
  }
});


module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  socialLogin,
  verifyOtp 
};
