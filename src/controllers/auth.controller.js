const { status } = require("http-status");
const catchAsync = require('../utils/catchAsync');
const { authService, userService, tokenService, emailService } = require('../services');
const ApiError = require('../utils/ApiError');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const otp = await tokenService.saveOTP(user.id);
  await emailService.sendSignupOTPEmail(user.email, otp); // Use signup OTP email
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

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
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

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(status.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(status.NO_CONTENT).send();
});

const socialLogin = catchAsync(async (req, res) => {
  const user = req.user;
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(status.OK).json({ user, tokens });
});


const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp, type } = req.body;
  const user = await userService.getUserByEmail(email);
  
  if (!user || !(await user.isOtpMatch(otp)) || new Date() > user.otpExpires) {
    throw new ApiError(status.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  await userService.updateUserById(user.id, { otp: null, otpExpires: null });

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
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  socialLogin,
  verifyOtp 
};
