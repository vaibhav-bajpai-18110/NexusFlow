import { AppError } from '../utils/AppError.js';

const ALLOWED_STATUSES = new Set(['online', 'offline', 'maintenance']);
const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{2,50}$/;

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

/**
 * Validates request payload for registering a new device.
 */
export function validateCreateDevice(req, _res, next) {
  const body = req.body;
  const errors = [];

  if (!body || !isPlainObject(body)) {
    return next(
      new AppError('Request body must be a valid JSON object', 400, [
        { field: 'body', message: 'Request body must be a valid JSON object' },
      ])
    );
  }

  // 1. deviceId validation
  const rawDeviceId = body.deviceId ?? body.device_id;
  if (rawDeviceId === undefined || rawDeviceId === null) {
    errors.push({ field: 'deviceId', message: 'deviceId is required' });
  } else if (typeof rawDeviceId !== 'string') {
    errors.push({ field: 'deviceId', message: 'deviceId must be a string' });
  } else {
    const trimmed = rawDeviceId.trim();
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

  // 6. location validation
  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== 'string') {
      errors.push({ field: 'location', message: 'location must be a string' });
    } else if (body.location.trim().length > 150) {
      errors.push({ field: 'location', message: 'location cannot exceed 150 characters' });
    }
  }

  // 7. description validation
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else if (body.description.trim().length > 500) {
      errors.push({ field: 'description', message: 'description cannot exceed 500 characters' });
    }
  }

  // 8. metadata validation
  if (body.metadata !== undefined && body.metadata !== null) {
    if (!isPlainObject(body.metadata)) {
      errors.push({ field: 'metadata', message: 'metadata must be a JSON object' });
    }
  }

  // 9. lastValue validation
  if (body.lastValue !== undefined && body.lastValue !== null) {
    if (typeof body.lastValue !== 'number' || !Number.isFinite(body.lastValue)) {
      errors.push({ field: 'lastValue', message: 'lastValue must be a finite number or null' });
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

  // Disallow mutating deviceId
  if (body.deviceId !== undefined || body.device_id !== undefined) {
    const attemptedId = (body.deviceId ?? body.device_id)?.toString().toUpperCase().trim();
    const routeId = req.params.id?.toString().toUpperCase().trim();
    if (attemptedId !== routeId) {
      errors.push({
        field: 'deviceId',
        message: 'deviceId is immutable and cannot be modified',
      });
    }
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

  if (body.type !== undefined) {
    if (typeof body.type !== 'string') {
      errors.push({ field: 'type', message: 'type must be a string' });
    } else if (body.type.trim().length > 50) {
      errors.push({ field: 'type', message: 'type cannot exceed 50 characters' });
    }
  }

  if (body.unit !== undefined) {
    if (typeof body.unit !== 'string') {
      errors.push({ field: 'unit', message: 'unit must be a string' });
    } else if (body.unit.trim().length > 20) {
      errors.push({ field: 'unit', message: 'unit cannot exceed 20 characters' });
    }
  }

  if (body.location !== undefined) {
    if (typeof body.location !== 'string') {
      errors.push({ field: 'location', message: 'location must be a string' });
    } else if (body.location.trim().length > 150) {
      errors.push({ field: 'location', message: 'location cannot exceed 150 characters' });
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string') {
      errors.push({ field: 'description', message: 'description must be a string' });
    } else if (body.description.trim().length > 500) {
      errors.push({ field: 'description', message: 'description cannot exceed 500 characters' });
    }
  }

  if (body.metadata !== undefined && body.metadata !== null) {
    if (!isPlainObject(body.metadata)) {
      errors.push({ field: 'metadata', message: 'metadata must be a JSON object' });
    }
  }

  if (errors.length > 0) {
    return next(new AppError('Validation failed for device update', 400, errors));
  }

  return next();
}
