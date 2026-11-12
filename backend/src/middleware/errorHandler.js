import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * Catch-all middleware for unmatched routes.
 */
export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

/**
 * Global Express error-handling middleware.
 */
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details ?? undefined;

  // Normalize malformed JSON payload errors raised by express.json().
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && statusCode === 400)) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  if (statusCode >= 500 && !env.isTest) {
    console.error('[ERROR]', err);
  }

  if (env.isProduction && statusCode >= 500 && !err.isOperational) {
    message = 'Internal Server Error';
    details = undefined;
  }

  const payload = {
    success: false,
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  if (!env.isProduction && !env.isTest && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}
