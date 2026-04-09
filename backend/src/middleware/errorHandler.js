const isProduction = process.env.NODE_ENV === 'production';

const getHttpStatus = (err) => {
  if (err.statusCode && Number.isInteger(err.statusCode)) return err.statusCode;
  if (err.status && Number.isInteger(err.status)) return err.status;

  // Mongoose validation error
  if (err.name === 'ValidationError') return 400;

  // Mongoose cast error (e.g. invalid ObjectId)
  if (err.name === 'CastError') return 400;

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return 401;

  // Mongoose duplicate key
  if (err.code === 11000) return 409;

  return 500;
};

const getSafeMessage = (err, status) => {
  if (isProduction) {
    const defaults = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests'
    };
    return defaults[status] || 'An unexpected error occurred';
  }

  // In development, surface the actual message for easier debugging
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return messages.length > 0 ? messages.join(', ') : err.message;
  }

  return err.message || 'An unexpected error occurred';
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = getHttpStatus(err);

  // Always log the full error server-side
  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — ${status}`, err);
  } else {
    console.warn(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} — ${status}:`, err.message);
  }

  const body = { error: getSafeMessage(err, status) };

  // Expose additional detail in development
  if (!isProduction && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
};
