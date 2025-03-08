const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const User = require('../models/user.model');
const passport = require('passport');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await User.findById(payload.sub);
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
      passReqToCallback: true, // Allows passing request object
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const role = req.query.state || 'member'; 

        let user = await User.findOne({ email: profile.emails[0].value });
        console.log(profile);
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            provider: 'google',
            role, // Save role from query params
            isEmailVerified: true,
            dob:new Date('01-01-2000'),
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);


// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: config.facebook.clientId,
      clientSecret: config.facebook.clientSecret,
      callbackURL: config.facebook.callbackURL,
      profileFields: ['id', 'displayName', 'emails'],
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const role = req.query.state || 'member';

        const email = profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`;

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            provider: 'facebook',
            role, // Save role from query params
            isEmailVerified: true,
            dob:new Date('01-01-2000'),
          });
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

module.exports = {
  jwtStrategy,
};
