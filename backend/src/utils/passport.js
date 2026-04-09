const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Generate avatar initials URL (same helper as userController)
const generateAvatarInitials = (firstName, lastName) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff`;
};

// Parse a display name into first and last name components
const parseDisplayName = (displayName, defaultFirst, defaultLast) => {
  const [first = defaultFirst, ...rest] = (displayName || `${defaultFirst} ${defaultLast}`).trim().split(' ');
  return { firstName: first, lastName: rest.join(' ') || defaultLast };
};

const setupGoogleStrategy = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/api/users/auth/google/callback';

  if (!clientID || !clientSecret) {
    console.warn('Google OAuth not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
    return;
  }

  passport.use(new GoogleStrategy(
    { clientID, clientSecret, callbackURL, scope: ['profile', 'email'] },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile.emails?.[0]?.value || '').toLowerCase().trim();
        const googleId = profile.id;
        const { firstName, lastName } = parseDisplayName(profile.displayName, 'Google', 'User');
        const picture = profile.photos?.[0]?.value || '';

        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
          user = await User.create({
            firstName,
            lastName,
            email,
            passwordHash: null,
            googleId,
            authProvider: 'google',
            avatar: picture || generateAvatarInitials(firstName, lastName),
            role: 'user',
            isActive: true,
            postsCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          if (!user.googleId) user.googleId = googleId;
          if (!user.avatar && picture) user.avatar = picture;
          user.updatedAt = new Date();
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
};

const setupGitHubStrategy = () => {
  const clientID = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackURL = process.env.GITHUB_CALLBACK_URL || '/api/users/auth/github/callback';

  if (!clientID || !clientSecret) {
    console.warn('GitHub OAuth not configured: GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required');
    return;
  }

  passport.use(new GitHubStrategy(
    { clientID, clientSecret, callbackURL, scope: ['user:email'] },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const rawEmail = profile.emails?.[0]?.value || '';
        const email = rawEmail.toLowerCase().trim();
        const githubId = profile.id ? String(profile.id) : null;
        const { firstName, lastName } = parseDisplayName(profile.displayName || profile.username, 'GitHub', 'User');
        const picture = profile.photos?.[0]?.value || '';

        // GitHub accounts may have no public email; require one to proceed
        if (!email) {
          return done(new Error('No email address associated with this GitHub account. Please add a public email in GitHub settings.'));
        }

        let user = await User.findOne({ $or: [{ githubId }, { email }] });

        if (!user) {
          user = await User.create({
            firstName,
            lastName,
            email,
            passwordHash: null,
            githubId,
            authProvider: 'github',
            avatar: picture || generateAvatarInitials(firstName, lastName),
            role: 'user',
            isActive: true,
            postsCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          if (!user.githubId) user.githubId = githubId;
          if (!user.avatar && picture) user.avatar = picture;
          user.updatedAt = new Date();
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
};

const initPassport = () => {
  setupGoogleStrategy();
  setupGitHubStrategy();
};

module.exports = { passport, initPassport };
