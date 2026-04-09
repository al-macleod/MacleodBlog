const { validationResult } = require('express-validator');

/**
 * Middleware that reads express-validator results and returns 422 if any
 * validation errors are present. Place this after validator chains in routes.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = validate;
