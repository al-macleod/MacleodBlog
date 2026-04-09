const { body } = require('express-validator');

const VALID_GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'];

const register = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('First name contains invalid characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[A-Za-z\s'-]+$/).withMessage('Last name contains invalid characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/\d/).withMessage('Password must include a number'),
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .isLength({ min: 7, max: 20 }).withMessage('Phone number must be between 7 and 20 characters'),
  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date of birth format'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(VALID_GENDERS).withMessage(`Gender must be one of: ${VALID_GENDERS.join(', ')}`),
  body('location')
    .trim()
    .notEmpty().withMessage('Location is required')
    .isLength({ max: 100 }).withMessage('Location must be at most 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
  body('interests')
    .optional()
    .custom((value) => {
      const arr = Array.isArray(value) ? value : [];
      if (arr.some((i) => typeof i !== 'string')) {
        throw new Error('Each interest must be a string');
      }
      return true;
    })
];

const login = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const forgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
];

const resetPassword = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/).withMessage('Password must include a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must include an uppercase letter')
    .matches(/\d/).withMessage('Password must include a number'),
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

const updateProfile = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio must be at most 500 characters'),
  body('website')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Website must be a valid URL (http or https)'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Location must be at most 100 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 7, max: 20 }).withMessage('Phone number must be between 7 and 20 characters'),
  body('interests')
    .optional()
    .custom((value) => {
      if (value !== undefined && !Array.isArray(value)) {
        throw new Error('Interests must be an array');
      }
      return true;
    }),
  body('socialHandles')
    .optional()
    .custom((value) => {
      if (value !== undefined && (typeof value !== 'object' || Array.isArray(value))) {
        throw new Error('socialHandles must be an object');
      }
      return true;
    }),
  body('socialHandles.twitter')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Twitter handle must be at most 50 characters'),
  body('socialHandles.linkedin')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage('LinkedIn handle must be at most 100 characters'),
  body('socialHandles.github')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('GitHub handle must be at most 50 characters'),
  body('socialHandles.instagram')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Instagram handle must be at most 50 characters')
];

const googleSignIn = [
  body('idToken')
    .trim()
    .notEmpty().withMessage('Google ID token is required')
];

module.exports = { register, login, forgotPassword, resetPassword, updateProfile, googleSignIn };
