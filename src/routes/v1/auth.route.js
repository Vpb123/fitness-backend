const express = require('express');
const validate = require('../../middlewares/validate');
const authValidation = require('../../validations/auth.validation');
const authController = require('../../controllers/auth.controller');
const auth = require('../../middlewares/auth');
const passport = require('passport');

const router = express.Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/login', validate(authValidation.login), authController.login);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetPassword);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);  
router.get('/google', (req, res, next) => {
    const role = req.query.role;
    console.log("role", role);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: role, 
    })(req, res, next);
  });
  
  router.get('/facebook', (req, res, next) => {
    const role = req.query.role;
    passport.authenticate('facebook', {
      scope: ['email'],
      state: role,
    })(req, res, next);
  });

router.get('/google/callback', passport.authenticate('google', { session: false }), authController.socialLogin);
router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), authController.socialLogin);
module.exports = router;
