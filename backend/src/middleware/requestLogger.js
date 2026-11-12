import { env } from '../config/env.js';

/**
 * Minimal HTTP request logger for development and runtime diagnostics.
 */
export function requestLogger(req, res, next) {
  if (env.isTest) {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`
    );
  });

  next();
}
