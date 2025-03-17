const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    dob: Joi.date().required().less('now').messages({
      'date.base': 'Date of Birth must be a valid date',
      'date.less': 'Date of Birth cannot be in the future',
    }),
    role: Joi.string().valid('member', 'trainer').required(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
    role: Joi.string().required()
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({

    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {

  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
    email: Joi.string().required().email()
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const verifyOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required().messages({
      'string.length': 'OTP must be exactly 6 digits',
      'any.required': 'OTP is required',
    }),
    type: Joi.string().valid('signup', 'reset-password').required(),
  }),
};


module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
  verifyOtp,
};
