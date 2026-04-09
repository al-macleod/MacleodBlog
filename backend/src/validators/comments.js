const { body, query } = require('express-validator');

const createComment = [
  body('postId')
    .trim()
    .notEmpty().withMessage('postId is required'),
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters'),
  body('author')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author name must be at most 100 characters'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
];

const getComments = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('skip must be a non-negative integer')
];

module.exports = { createComment, getComments };
