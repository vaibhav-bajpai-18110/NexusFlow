import { AppError } from '../utils/AppError.js';

const ALLOWED_OPERATORS = new Set(['>', '>=', '<', '<=', '==', '!=']);
const ALLOWED_SEVERITIES = new Set(['critical', 'warning', 'info']);
const ALLOWED_ACTION_TYPES = new Set(['alert', 'notification', 'webhook']);
const ALLOWED_STATUSES = new Set(['active', 'disabled']);

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Validates request payload for creating a new rule.
 */
export function validateCreateRule(req, _res, next) {
  const body = req.body;
  const errors = [];

  if (!body || !isPlainObject(body)) {
    return next(
      new AppError('Request body must be a valid JSON object', 400, [
        { field: 'body', message: 'Request body must be a valid JSON object' },
      ])
    );
  }

  // 1. name validation
  if (!body.name) {
    errors.push({ field: 'name', message: 'name is required' });
  } else if (typeof body.name !== 'string') {
    errors.push({ field: 'name', message: 'name must be a string' });
  } else {
    const trimmed = body.name.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      errors.push({ field: 'name', message: 'name must be between 2 and 100 characters long' });
    }
  }

  // 2. deviceId validation
  const rawDeviceId = body.deviceId ?? body.device_id;
  if (!rawDeviceId) {
    errors.push({ field: 'deviceId', message: 'deviceId is required' });
  } else if (typeof rawDeviceId !== 'string') {
    errors.push({ field: 'deviceId', message: 'deviceId must be a string' });
  } else if (rawDeviceId.trim().length === 0) {
    errors.push({ field: 'deviceId', message: 'deviceId cannot be empty' });
  } else if (rawDeviceId.trim().length > 50) {
    errors.push({ field: 'deviceId', message: 'deviceId cannot exceed 50 characters' });
  }

  // 3. metric validation
  if (!body.metric) {
    errors.push({ field: 'metric', message: 'metric is required' });
  } else if (typeof body.metric !== 'string') {
    errors.push({ field: 'metric', message: 'metric must be a string' });
  } else {
    const trimmedMetric = body.metric.trim();
    if (trimmedMetric.length < 1 || trimmedMetric.length > 50) {
      errors.push({ field: 'metric', message: 'metric must be between 1 and 50 characters long' });
    }
  }

  // 4. condition validation
  if (!body.condition) {
    errors.push({ field: 'condition', message: 'condition object is required' });
  } else if (!isPlainObject(body.condition)) {
    errors.push({ field: 'condition', message: 'condition must be a JSON object' });
  } else {
    // operator
    const operator = body.condition.operator;
    if (!operator) {
      errors.push({ field: 'condition.operator', message: 'condition.operator is required' });
    } else if (typeof operator !== 'string' || !ALLOWED_OPERATORS.has(operator.trim())) {
      errors.push({
        field: 'condition.operator',
        message: `condition.operator must be one of: ${Array.from(ALLOWED_OPERATORS).join(', ')}`,
      });
    }

    // threshold
    const threshold = body.condition.threshold;
    if (threshold === undefined || threshold === null) {
      errors.push({ field: 'condition.threshold', message: 'condition.threshold is required' });
    } else {
      const numThreshold = Number(threshold);
      if (typeof threshold !== 'number' && typeof threshold !== 'string') {
        errors.push({
          field: 'condition.threshold',
          message: 'condition.threshold must be a number',
        });
      } else if (!Number.isFinite(numThreshold)) {
        errors.push({
          field: 'condition.threshold',
          message: 'condition.threshold must be a finite number',
        });
      }
    }
  }

  // 5. action validation (optional)
  if (body.action !== undefined && body.action !== null) {
    if (!isPlainObject(body.action)) {
      errors.push({ field: 'action', message: 'action must be a JSON object' });
    } else {
      if (body.action.severity !== undefined) {
        if (
          typeof body.action.severity !== 'string' ||
          !ALLOWED_SEVERITIES.has(body.action.severity.toLowerCase().trim())
        ) {
          errors.push({
            field: 'action.severity',
            message: `action.severity must be one of: ${Array.from(ALLOWED_SEVERITIES).join(', ')}`,
          });
        }
      }
      if (body.action.type !== undefined) {
        if (
          typeof body.action.type !== 'string' ||
          !ALLOWED_ACTION_TYPES.has(body.action.type.toLowerCase().trim())
        ) {
          errors.push({
            field: 'action.type',
            message: `action.type must be one of: ${Array.from(ALLOWED_ACTION_TYPES).join(', ')}`,
          });
        }
      }
      if (body.action.message !== undefined && typeof body.action.message !== 'string') {
        errors.push({ field: 'action.message', message: 'action.message must be a string' });
      }
    }
  }

  // 6. status & enabled validation (optional)
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status.toLowerCase().trim())) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
      });
    }
  }

  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    errors.push({ field: 'enabled', message: 'enabled must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed for rule creation', 400, errors));
  }

  return next();
}

/**
 * Validates request payload for updating an existing rule.
 */
export function validateUpdateRule(req, _res, next) {
  const body = req.body;
  const errors = [];

  if (!body || !isPlainObject(body)) {
    return next(
      new AppError('Request body must be a valid JSON object', 400, [
        { field: 'body', message: 'Request body must be a valid JSON object' },
      ])
    );
  }

  if (Object.keys(body).length === 0) {
    return next(
      new AppError('Update payload cannot be empty', 400, [
        { field: 'body', message: 'Provide at least one field to update' },
      ])
    );
  }

  // Disallow mutating ruleId
  if (body.ruleId !== undefined || body.id !== undefined) {
    const attemptedId = (body.ruleId ?? body.id)?.toString().toUpperCase().trim();
    const routeId = req.params.id?.toString().toUpperCase().trim();
    if (attemptedId !== routeId) {
      errors.push({
        field: 'ruleId',
        message: 'ruleId is immutable and cannot be modified',
      });
    }
  }

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'name must be a string between 2 and 100 characters' });
    }
  }

  if (body.condition !== undefined) {
    if (!isPlainObject(body.condition)) {
      errors.push({ field: 'condition', message: 'condition must be a JSON object' });
    } else {
      if (body.condition.operator !== undefined) {
        if (!ALLOWED_OPERATORS.has(body.condition.operator.toString().trim())) {
          errors.push({
            field: 'condition.operator',
            message: `condition.operator must be one of: ${Array.from(ALLOWED_OPERATORS).join(', ')}`,
          });
        }
      }
      if (body.condition.threshold !== undefined) {
        const num = Number(body.condition.threshold);
        if (!Number.isFinite(num)) {
          errors.push({
            field: 'condition.threshold',
            message: 'condition.threshold must be a finite number',
          });
        }
      }
    }
  }

  if (body.action !== undefined) {
    if (!isPlainObject(body.action)) {
      errors.push({ field: 'action', message: 'action must be a JSON object' });
    } else {
      if (body.action.severity !== undefined && !ALLOWED_SEVERITIES.has(body.action.severity.toLowerCase().trim())) {
        errors.push({
          field: 'action.severity',
          message: `action.severity must be one of: ${Array.from(ALLOWED_SEVERITIES).join(', ')}`,
        });
      }
    }
  }

  if (body.status !== undefined && !ALLOWED_STATUSES.has(body.status.toLowerCase().trim())) {
    errors.push({
      field: 'status',
      message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
    });
  }

  if (body.enabled !== undefined && typeof body.enabled !== 'boolean') {
    errors.push({ field: 'enabled', message: 'enabled must be a boolean' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed for rule update', 400, errors));
  }

  return next();
}
