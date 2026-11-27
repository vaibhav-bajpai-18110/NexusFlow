import { AppError } from '../utils/AppError.js';

const RESERVED_KEYS = new Set([
  'deviceid',
  'device_id',
  'timestamp',
  'metrics',
  'readings',
  'data',
  'receivedat',
  'ingestedat',
  'sensorid',
  'sensor_id',
  'metric',
  'value',
  'unit',
  'metadata',
]);

/**
 * Validates a single telemetry record.
 * Returns { valid: boolean, errors: Array<{ field: string, message: string }>, normalized?: object }
 */
export function validateSingleTelemetry(item, itemPrefix = '') {
  const errors = [];

  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return {
      valid: false,
      errors: [
        {
          field: itemPrefix ? `${itemPrefix}` : 'body',
          message: 'Telemetry item must be a JSON object',
        },
      ],
    };
  }

  // 1. Validate deviceId
  const rawDeviceId = item.deviceId ?? item.device_id;
  const deviceIdField = itemPrefix ? `${itemPrefix}.deviceId` : 'deviceId';

  if (rawDeviceId === undefined || rawDeviceId === null) {
    errors.push({
      field: deviceIdField,
      message: 'deviceId is required',
    });
  } else if (typeof rawDeviceId !== 'string') {
    errors.push({
      field: deviceIdField,
      message: 'deviceId must be a string',
    });
  } else if (rawDeviceId.trim().length === 0) {
    errors.push({
      field: deviceIdField,
      message: 'deviceId cannot be empty',
    });
  } else if (rawDeviceId.trim().length > 100) {
    errors.push({
      field: deviceIdField,
      message: 'deviceId cannot exceed 100 characters',
    });
  }

  // 2. Validate timestamp (optional, defaults to now)
  let normalizedTimestamp;
  const timestampField = itemPrefix ? `${itemPrefix}.timestamp` : 'timestamp';

  if (item.timestamp !== undefined && item.timestamp !== null) {
    if (typeof item.timestamp === 'string' || typeof item.timestamp === 'number') {
      const parsedDate = new Date(item.timestamp);
      if (Number.isNaN(parsedDate.getTime())) {
        errors.push({
          field: timestampField,
          message: 'timestamp must be a valid ISO 8601 date string or Unix timestamp',
        });
      } else {
        normalizedTimestamp = parsedDate.toISOString();
      }
    } else {
      errors.push({
        field: timestampField,
        message: 'timestamp must be a string or number',
      });
    }
  } else {
    normalizedTimestamp = new Date().toISOString();
  }

  // 3. Validate optional sensorId, unit, and metadata
  let normalizedSensorId = null;
  const rawSensorId = item.sensorId ?? item.sensor_id;
  if (rawSensorId !== undefined && rawSensorId !== null) {
    if (typeof rawSensorId !== 'string' && typeof rawSensorId !== 'number') {
      errors.push({
        field: itemPrefix ? `${itemPrefix}.sensorId` : 'sensorId',
        message: 'sensorId must be a string or number',
      });
    } else {
      normalizedSensorId = String(rawSensorId).trim();
    }
  }

  let normalizedUnit = '';
  if (item.unit !== undefined && item.unit !== null) {
    if (typeof item.unit !== 'string') {
      errors.push({
        field: itemPrefix ? `${itemPrefix}.unit` : 'unit',
        message: 'unit must be a string',
      });
    } else {
      normalizedUnit = item.unit.trim();
    }
  }

  let normalizedMetadata = {};
  if (item.metadata !== undefined && item.metadata !== null) {
    if (typeof item.metadata !== 'object' || Array.isArray(item.metadata)) {
      errors.push({
        field: itemPrefix ? `${itemPrefix}.metadata` : 'metadata',
        message: 'metadata must be a JSON object',
      });
    } else {
      normalizedMetadata = item.metadata;
    }
  }

  // 4. Extract and validate metrics / readings
  const collectedMetrics = {};
  const metricCandidates = {};

  // Check explicit single-metric format ({ metric, value })
  if (item.metric !== undefined || item.value !== undefined) {
    const metricField = itemPrefix ? `${itemPrefix}.metric` : 'metric';
    const valueField = itemPrefix ? `${itemPrefix}.value` : 'value';

    if (item.metric === undefined || item.metric === null || typeof item.metric !== 'string' || item.metric.trim() === '') {
      errors.push({
        field: metricField,
        message: 'metric is required and must be a non-empty string when value is provided',
      });
    } else if (item.value === undefined || item.value === null) {
      errors.push({
        field: valueField,
        message: 'value is required when metric is provided',
      });
    } else {
      const metricName = item.metric.trim();
      const val = item.value;

      if (typeof val === 'number') {
        if (!Number.isFinite(val)) {
          errors.push({
            field: valueField,
            message: `Metric "${metricName}" must be a finite number`,
          });
        } else {
          collectedMetrics[metricName] = val;
        }
      } else if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) {
        collectedMetrics[metricName] = Number(val);
      } else {
        errors.push({
          field: valueField,
          message: `Metric "${metricName}" must be a valid number, received ${typeof val}`,
        });
      }
    }
  }

  // Root level flat fields
  for (const [key, value] of Object.entries(item)) {
    if (!RESERVED_KEYS.has(key.toLowerCase())) {
      metricCandidates[key] = value;
    }
  }

  // Nested metrics/readings/data objects if provided
  const nestedObjects = [item.metrics, item.readings, item.data];
  for (const nested of nestedObjects) {
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      for (const [key, value] of Object.entries(nested)) {
        metricCandidates[key] = value;
      }
    }
  }

  const candidateKeys = Object.keys(metricCandidates);

  for (const key of candidateKeys) {
    const val = metricCandidates[key];
    const metricField = itemPrefix ? `${itemPrefix}.${key}` : key;

    if (typeof val === 'number') {
      if (!Number.isFinite(val)) {
        errors.push({
          field: metricField,
          message: `Metric "${key}" must be a finite number`,
        });
      } else {
        collectedMetrics[key] = val;
      }
    } else if (typeof val === 'string' && val.trim() !== '' && Number.isFinite(Number(val))) {
      // Coerce parseable numeric string (e.g. "85.2") to number
      collectedMetrics[key] = Number(val);
    } else {
      errors.push({
        field: metricField,
        message: `Metric "${key}" must be a valid number, received ${typeof val}`,
      });
    }
  }

  if (Object.keys(collectedMetrics).length === 0) {
    errors.push({
      field: itemPrefix ? `${itemPrefix}.metrics` : 'metrics',
      message:
        'At least one numeric sensor metric (e.g., temperature, pressure, vibration) is required',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const deviceId = rawDeviceId.trim();
  const receivedAt = new Date().toISOString();

  const primaryMetric = (item.metric && typeof item.metric === 'string')
    ? item.metric.trim()
    : Object.keys(collectedMetrics)[0] || null;
  const primaryValue = (item.value !== undefined && Number.isFinite(Number(item.value)))
    ? Number(item.value)
    : (primaryMetric ? collectedMetrics[primaryMetric] : null);

  const normalized = {
    deviceId,
    sensorId: normalizedSensorId,
    timestamp: normalizedTimestamp,
    metric: primaryMetric,
    value: primaryValue,
    unit: normalizedUnit,
    metrics: collectedMetrics,
    metadata: normalizedMetadata,
    ...collectedMetrics,
    receivedAt,
  };

  return { valid: true, errors: [], normalized };
}

/**
 * Express middleware to validate telemetry ingestion requests.
 * Supports both a single telemetry JSON object and an array of objects.
 */
export function validateTelemetry(req, _res, next) {
  const body = req.body;

  if (!body || (typeof body === 'object' && Object.keys(body).length === 0 && !Array.isArray(body))) {
    return next(
      new AppError('Request body cannot be empty', 400, [
        { field: 'body', message: 'Request body must contain telemetry data' },
      ])
    );
  }

  const rawBatch = Array.isArray(body)
    ? body
    : (body?.batch && Array.isArray(body.batch))
      ? body.batch
      : (body?.data && Array.isArray(body.data))
        ? body.data
        : null;

  if (rawBatch !== null) {
    if (rawBatch.length === 0) {
      return next(
        new AppError('Telemetry batch array cannot be empty', 400, [
          { field: 'body', message: 'Batch telemetry array must contain at least one item' },
        ])
      );
    }

    if (rawBatch.length > 500) {
      return next(
        new AppError('Telemetry batch exceeds maximum allowed limit of 500 items', 400, [
          { field: 'body', message: 'Max batch limit is 500 items' },
        ])
      );
    }

    const allErrors = [];
    const normalizedList = [];

    for (let i = 0; i < rawBatch.length; i++) {
      const result = validateSingleTelemetry(rawBatch[i], `[${i}]`);
      if (!result.valid) {
        allErrors.push(...result.errors);
      } else {
        normalizedList.push(result.normalized);
      }
    }

    if (allErrors.length > 0) {
      return next(new AppError('Validation failed for batch telemetry data', 400, allErrors));
    }

    req.isBatchTelemetry = true;
    req.validatedTelemetry = normalizedList;
    return next();
  }

  const result = validateSingleTelemetry(body);
  if (!result.valid) {
    return next(new AppError('Validation failed for telemetry data', 400, result.errors));
  }

  req.isBatchTelemetry = false;
  req.validatedTelemetry = result.normalized;
  return next();
}
