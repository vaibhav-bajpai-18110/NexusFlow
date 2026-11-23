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

  // 1. Normalize malformed JSON payload errors raised by express.json()
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && statusCode === 400)) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  // 2. Handle URI decoding errors (e.g., malformed URL params)
  if (err instanceof URIError) {
    statusCode = 400;
    message = 'Malformed URL path or query parameter';
  }

  // 3. Handle MongoDB/Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    const duplicatedValue = err.keyValue ? err.keyValue[duplicatedField] : '';
    message = `Duplicate value '${duplicatedValue}' for field '${duplicatedField}'. Must be unique.`;
  }

  // 4. Handle Mongoose Schema Validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Database validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // 5. Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
    details = [{ field: err.path, message: `Cannot cast value to ${err.kind}` }];
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
