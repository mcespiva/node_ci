const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');

const keys = require('../config/keys');

const User = mongoose.model('User');

const strategy = new GoogleStrategy(
  {
    callbackURL: '/auth/google/callback',
    clientID: keys.googleClientID,
    clientSecret: keys.googleClientSecret,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = await new User({
        googleId: profile.id,
        displayName: profile.displayName
      }).save();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
);

if (process.env.https_proxy) {
  const HttpsProxyAgent = require('https-proxy-agent');
  const httpsProxyAgent = new HttpsProxyAgent(process.env.https_proxy);
  strategy._oauth2.setAgent(httpsProxyAgent);
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then(user => {
    done(null, user);
  });
});

passport.use(
  strategy
);
