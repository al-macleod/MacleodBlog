const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const {
  cookieName,
  getCookieOptions,
  getClearCookieOptions,
  createUserToken
} = require('../utils/userSession');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/; // Basic phone validation
const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const googleClient = new OAuth2Client();
const passwordRules = {
  minLength: 8,
  hasLower: /[a-z]/,
  hasUpper: /[A-Z]/,
  hasNumber: /\d/
};

const normalizePhone = (value = '') => value.replace(/\s|\-|\(|\)/g, '');

const getResetTokenTTLMinutes = () => {
  const ttl = Number(process.env.RESET_PASSWORD_TOKEN_TTL_MINUTES);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : 30;
};

const getPasswordValidationError = (password, confirmPassword) => {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }

  if (password.length < passwordRules.minLength) {
    return `Password must be at least ${passwordRules.minLength} characters`;
  }

  if (!passwordRules.hasLower.test(password)) {
    return 'Password must include a lowercase letter';
  }

  if (!passwordRules.hasUpper.test(password)) {
    return 'Password must include an uppercase letter';
  }

  if (!passwordRules.hasNumber.test(password)) {
    return 'Password must include a number';
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return 'Password confirmation does not match';
  }

  return null;
};

const validateAge = (dateValue) => {
  if (!dateValue) return false;
  const birthDate = new Date(dateValue);
  if (Number.isNaN(birthDate.getTime())) return false;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 13;
};

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID;

const verifyGoogleIdToken = async (idToken) => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: clientId
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error('Invalid Google identity payload');
  }

  return payload;
};

// Generate avatar initials URL
const generateAvatarInitials = (firstName, lastName) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  // Using UI Avatars service for initials-based avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff`;
};

const toPublicUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone || '',
  dateOfBirth: user.dateOfBirth,
  gender: user.gender,
  location: user.location || '',
  bio: user.bio || '',
  interests: user.interests || [],
  website: user.website || '',
  socialHandles: user.socialHandles || {},
  avatar: user.avatar,
  role: user.role,
  postsCount: user.postsCount || 0,
  createdAt: user.createdAt
});

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      phone,
      dateOfBirth,
      gender,
      location,
      bio,
      interests
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !dateOfBirth || !location || !gender || !phone) {
      return res.status(400).json({ error: 'First name, last name, email, password, phone, DOB, location, and gender are required' });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ error: 'First and last names must be at least 2 characters' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!passwordStrengthRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, and a number' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Password confirmation does not match' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (!validateAge(dateOfBirth)) {
      return res.status(400).json({ error: 'You must be at least 13 years old to register' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(409).json({ error: 'An account with this phone number already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const avatar = generateAvatarInitials(firstName, lastName);

    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: normalizedPhone,
      passwordHash,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || 'prefer-not-to-say',
      location: location?.trim() || '',
      bio: bio?.trim() || '',
      interests: Array.isArray(interests) ? interests.filter(i => typeof i === 'string') : [],
      avatar,
      authProvider: 'local',
      role: 'user',
      postsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const token = createUserToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.cookie(cookieName, token, getCookieOptions());
    return res.status(201).json({ user: toPublicUser(user), authenticated: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses social sign in. Use Google to continue.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createUserToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.cookie(cookieName, token, getCookieOptions());
    return res.json({ user: toPublicUser(user), authenticated: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie(cookieName, getClearCookieOptions());
  return res.json({ authenticated: false });
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const safeResponse = {
      message: 'If an account with that email exists, password reset instructions have been sent.'
    };

    if (!email || !emailRegex.test(email)) {
      return res.json(safeResponse);
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
      passwordHash: { $ne: null }
    });

    if (!user) {
      return res.json(safeResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = getResetTokenTTLMinutes();

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    user.updatedAt = new Date();
    await user.save();

    if (process.env.NODE_ENV !== 'production') {
      const appUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
      return res.json({
        ...safeResponse,
        resetToken: rawToken,
        resetUrl: `${appUrl}/auth?mode=reset&token=${rawToken}`
      });
    }

    return res.json(safeResponse);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    const passwordError = getPasswordValidationError(password, confirmPassword);
    if (passwordError || !passwordStrengthRegex.test(password)) {
      return res.status(400).json({
        error: passwordError || 'Password must be at least 8 characters and include uppercase, lowercase, and a number'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordTokenHash = null;
    user.resetPasswordExpiresAt = null;
    user.updatedAt = new Date();
    await user.save();

    return res.json({ message: 'Password has been reset successfully. You can now sign in.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId });
    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: toPublicUser(user), authenticated: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      bio,
      interests,
      website,
      location,
      phone,
      socialHandles
    } = req.body;

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only allowed fields
    if (bio !== undefined) user.bio = bio.trim().slice(0, 500);
    if (interests !== undefined && Array.isArray(interests)) user.interests = interests;
    if (website !== undefined) user.website = website.trim();
    if (location !== undefined) user.location = location.trim();
    if (phone !== undefined && phoneRegex.test(phone.replace(/\s/g, ''))) user.phone = phone.trim();
    if (socialHandles !== undefined) user.socialHandles = socialHandles;

    user.updatedAt = new Date();
    await user.save();

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId, isActive: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Google id token is required' });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;
    const [firstNameFallback = 'Google', ...restName] = (payload.name || 'Google User').trim().split(' ');
    const lastNameFallback = restName.join(' ') || 'User';

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName: firstNameFallback,
        lastName: lastNameFallback,
        email,
        phone: '',
        passwordHash: null,
        dateOfBirth: null,
        gender: 'prefer-not-to-say',
        location: '',
        bio: '',
        interests: [],
        avatar: payload.picture || generateAvatarInitials(firstNameFallback, lastNameFallback),
        googleId,
        authProvider: 'google',
        role: 'user',
        isActive: true,
        postsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      user.googleId = user.googleId || googleId;
      user.authProvider = user.authProvider || 'google';
      user.avatar = user.avatar || payload.picture || user.avatar;
      user.updatedAt = new Date();
      await user.save();
    }

    const token = createUserToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.cookie(cookieName, token, getCookieOptions());
    return res.json({
      user: toPublicUser(user),
      authenticated: true
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Google sign in failed' });
  }
};