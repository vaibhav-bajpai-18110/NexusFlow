/**
 * Operational error representing expected HTTP/API failure conditions.
 */
export class AppError extends Error {
  /**
   * @param {string} message Human-readable error description
   * @param {number} [statusCode=500] HTTP status code
   * @param {unknown} [details=null] Optional structured validation/error context
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}
