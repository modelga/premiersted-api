const passport = require('passport');
const express = require('express');

const config = require('./../config')();
const jwt = require('./jwt');

const app = express();
app.use(passport.initialize());

const GitHubStrategy = require('passport-github').Strategy;
const { users } = require('../db');
const accounts = require('../services/accounts');

const redirectURI = config.get('GITHUB_REDIRECT_URI');

passport.use(new GitHubStrategy(
  {
    clientID: config.get('GITHUB_CLIENT_ID'),
    clientSecret: config.get('GITHUB_SECRET'),
  },
  async (accessToken, refreshToken, profile, done) => {
    // Use here provider-to-user mapping
    const ghId = `github:${profile.id}`;
    const id = await accounts.findOrCreateNew(ghId);

      const { avatar_url, name, email, login } = profile._json; // eslint-disable-line

    const userProfile = {
      id,
      avatar_url: avatar_url.split('?')[0],
      name: name || login,
      login,
      email,
      provider: 'github',
    }; // split because JWT is weird

    const data = await users.findById(id);
    if (data) {
      const updated = await users.updateMeta({
        id,
        ...data,
        ...userProfile,
      });
      done(null, { ...updated });
    } else {
      const inserted = await users.store({
        id,
        ...userProfile,
      });
      done(null, { ...inserted });
    }
  },
));

app.get('/', (req, res) => {
  const returnUrl = req.query.returnUrl ? `?returnUrl=${req.query.returnUrl}` : '';
  const where = req.query.where && returnUrl ? `&where=${req.query.where}` : '';
  const options = {
    scope: ['user:email'],
    callbackURL: `${redirectURI}${returnUrl}${where}`,
  };
  passport.authenticate('github', options)(req, res);
});

app.get(
  '/callback',
  passport.authenticate('github', {
    failureRedirect: '/login',
    session: false,
  }),
  jwt.auth,
);

module.exports = app;
