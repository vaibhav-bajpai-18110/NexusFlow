import { AppError } from '../utils/AppError.js';

const ALLOWED_STATUSES = new Set(['online', 'offline', 'maintenance']);
const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{2,50}$/;

/**
 * Validates request payload for registering a new device.
 */
export function validateCreateDevice(req, _res, next) {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(
      new AppError('Request body must be a JSON object', 400, [
        { field: 'body', message: 'Request body must be a JSON object' },
      ])
    );
  }

  // 1. deviceId validation
  const deviceId = body.deviceId ?? body.device_id;
  if (!deviceId) {
    errors.push({ field: 'deviceId', message: 'deviceId is required' });
  } else if (typeof deviceId !== 'string') {
    errors.push({ field: 'deviceId', message: 'deviceId must be a string' });
  } else {
    const trimmed = deviceId.trim();
    if (trimmed.length < 2 || trimmed.length > 50) {
      errors.push({
        field: 'deviceId',
        message: 'deviceId must be between 2 and 50 characters long',
      });
    } else if (!DEVICE_ID_REGEX.test(trimmed)) {
      errors.push({
        field: 'deviceId',
        message: 'deviceId can only contain letters, numbers, hyphens (-), and underscores (_)',
      });
    }
  }

  // 2. name validation
  if (body.name !== undefined && body.name !== null) {
    if (typeof body.name !== 'string') {
      errors.push({ field: 'name', message: 'name must be a string' });
    } else if (body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'name cannot be empty' });
    } else if (body.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'name cannot exceed 100 characters' });
    }
  }

  // 3. status validation
  if (body.status !== undefined && body.status !== null) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status.toLowerCase().trim())) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
      });
    }
  }

  // 4. type validation
  if (body.type !== undefined && body.type !== null) {
    if (typeof body.type !== 'string') {
      errors.push({ field: 'type', message: 'type must be a string' });
    } else if (body.type.trim().length > 50) {
      errors.push({ field: 'type', message: 'type cannot exceed 50 characters' });
    }
  }

  // 5. unit validation
  if (body.unit !== undefined && body.unit !== null) {
    if (typeof body.unit !== 'string') {
      errors.push({ field: 'unit', message: 'unit must be a string' });
    } else if (body.unit.trim().length > 20) {
      errors.push({ field: 'unit', message: 'unit cannot exceed 20 characters' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed for device registration', 400, errors));
  }

  return next();
}

/**
 * Validates request payload for updating an existing device.
 */
export function validateUpdateDevice(req, _res, next) {
  const body = req.body;
  const errors = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(
      new AppError('Request body must be a JSON object', 400, [
        { field: 'body', message: 'Request body must be a JSON object' },
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

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      errors.push({ field: 'name', message: 'name must be a string' });
    } else if (body.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'name cannot be empty' });
    } else if (body.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'name cannot exceed 100 characters' });
    }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !ALLOWED_STATUSES.has(body.status.toLowerCase().trim())) {
      errors.push({
        field: 'status',
        message: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`,
      });
    }
  }

  if (body.type !== undefined && typeof body.type !== 'string') {
    errors.push({ field: 'type', message: 'type must be a string' });
  }

  if (body.unit !== undefined && typeof body.unit !== 'string') {
    errors.push({ field: 'unit', message: 'unit must be a string' });
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed for device update', 400, errors));
  }

  return next();
}
