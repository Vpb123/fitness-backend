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
    user.roleId = payload.roleId;

    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
      passReqToCallback: true, 
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const role = req.query.state === "trainer" ? "trainer" : "member"; 

        let user = await User.findOne({ email: profile.emails[0].value });
        console.log(profile);
        if (!user) {
          user = await User.create({
            firstName: profile.name.givenName,
            lastName:profile.name.familyName,
            email: profile.emails[0].value,
            provider: 'google',
            role, 
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
        const role = req.query.state === "trainer" ? "trainer" : "member"; 

        const email = profile.emails ? profile.emails[0].value : `${profile.id}@facebook.com`;
        const [firstName, ...lastNameParts] = profile.displayName.split(" ");
        const lastName = lastNameParts.join(" ") || " ";

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            firstName: firstName,
            lastName:lastName,
            email,
            provider: 'facebook',
            role, 
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
