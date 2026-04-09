const { body, query } = require('express-validator');

const VALID_TYPES = ['tweet', 'article'];
const VALID_SORT_BY = ['quality', 'newest', 'oldest', 'mostViewed', 'mostLiked'];

const createPost = [
  body('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`Post type must be one of: ${VALID_TYPES.join(', ')}`),
  body('content')
    .notEmpty().withMessage('Content is required')
    .isLength({ max: 100000 }).withMessage('Content is too long'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Excerpt must be at most 500 characters'),
  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 70 }).withMessage('SEO title must be at most 70 characters'),
  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('SEO description must be at most 160 characters'),
  body('isPublished')
    .optional()
    .isBoolean().withMessage('isPublished must be a boolean')
];

const updatePost = [
  body('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`Post type must be one of: ${VALID_TYPES.join(', ')}`),
  body('content')
    .optional()
    .notEmpty().withMessage('Content cannot be empty if provided')
    .isLength({ max: 100000 }).withMessage('Content is too long'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Excerpt must be at most 500 characters'),
  body('seoTitle')
    .optional()
    .trim()
    .isLength({ max: 70 }).withMessage('SEO title must be at most 70 characters'),
  body('seoDescription')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('SEO description must be at most 160 characters'),
  body('isPublished')
    .optional()
    .isBoolean().withMessage('isPublished must be a boolean')
];

const getPosts = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('skip must be a non-negative integer'),
  query('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query is too long')
];

const getLibrary = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('skip')
    .optional()
    .isInt({ min: 0 }).withMessage('skip must be a non-negative integer'),
  query('type')
    .optional()
    .isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
  query('sortBy')
    .optional()
    .isIn(VALID_SORT_BY).withMessage(`sortBy must be one of: ${VALID_SORT_BY.join(', ')}`),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Search query is too long')
];

module.exports = { createPost, updatePost, getPosts, getLibrary };
