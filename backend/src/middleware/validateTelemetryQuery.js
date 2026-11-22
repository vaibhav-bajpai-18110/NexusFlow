import { AppError } from '../utils/AppError.js';

const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]{2,50}$/;
const ALLOWED_SORTS = new Set(['asc', 'desc']);

/**
 * Middleware to validate query parameters and deviceId for telemetry retrieval endpoints.
 * Validates: deviceId, limit, page, startDate/from, endDate/to, metric, sort.
 */
export function validateTelemetryQuery(req, _res, next) {
  const errors = [];
  const query = req.query;

  // 1. Validate deviceId (from route params or query string)
  const rawDeviceId = req.params.deviceId || query.deviceId;
  if (rawDeviceId !== undefined && rawDeviceId !== null && rawDeviceId !== '') {
    if (typeof rawDeviceId !== 'string') {
      errors.push({
        field: 'deviceId',
        message: 'deviceId must be a string',
      });
    } else {
      const trimmedId = rawDeviceId.trim();
      if (trimmedId.length < 2 || trimmedId.length > 50) {
        errors.push({
          field: 'deviceId',
          message: 'deviceId must be between 2 and 50 characters long',
        });
      } else if (!DEVICE_ID_REGEX.test(trimmedId)) {
        errors.push({
          field: 'deviceId',
          message:
            'deviceId can only contain alphanumeric characters, hyphens (-), and underscores (_)',
        });
      } else {
        // Normalize deviceId for downstream handler
        req.normalizedDeviceId = trimmedId.toUpperCase();
      }
    }
  }

  // 2. Validate limit
  if (query.limit !== undefined && query.limit !== null && query.limit !== '') {
    const rawLimit = Number(query.limit);
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 1000) {
      errors.push({
        field: 'limit',
        message: 'limit must be an integer between 1 and 1000',
      });
    } else {
      req.validatedLimit = rawLimit;
    }
  } else {
    req.validatedLimit = 50;
  }

  // 3. Validate page
  if (query.page !== undefined && query.page !== null && query.page !== '') {
    const rawPage = Number(query.page);
    if (!Number.isInteger(rawPage) || rawPage < 1) {
      errors.push({
        field: 'page',
        message: 'page must be an integer greater than or equal to 1',
      });
    } else {
      req.validatedPage = rawPage;
    }
  } else {
    req.validatedPage = 1;
  }

  // 4. Validate startDate / from
  let parsedStartDate = null;
  const rawStartDate = query.startDate ?? query.from;
  if (rawStartDate !== undefined && rawStartDate !== null && rawStartDate !== '') {
    const d = new Date(rawStartDate);
    if (Number.isNaN(d.getTime())) {
      errors.push({
        field: 'startDate',
        message: 'startDate must be a valid ISO 8601 date string or Unix timestamp',
      });
    } else {
      parsedStartDate = d;
      req.validatedStartDate = d.toISOString();
    }
  }

  // 5. Validate endDate / to
  let parsedEndDate = null;
  const rawEndDate = query.endDate ?? query.to;
  if (rawEndDate !== undefined && rawEndDate !== null && rawEndDate !== '') {
    const d = new Date(rawEndDate);
    if (Number.isNaN(d.getTime())) {
      errors.push({
        field: 'endDate',
        message: 'endDate must be a valid ISO 8601 date string or Unix timestamp',
      });
    } else {
      parsedEndDate = d;
      req.validatedEndDate = d.toISOString();
    }
  }

  // Check date range consistency
  if (parsedStartDate && parsedEndDate && parsedStartDate.getTime() > parsedEndDate.getTime()) {
    errors.push({
      field: 'startDate',
      message: 'startDate cannot be later than endDate',
    });
  }

  // 6. Validate metric
  if (query.metric !== undefined && query.metric !== null && query.metric !== '') {
    if (typeof query.metric !== 'string') {
      errors.push({
        field: 'metric',
        message: 'metric must be a string',
      });
    } else {
      const trimmedMetric = query.metric.trim();
      if (trimmedMetric.length < 1 || trimmedMetric.length > 50) {
        errors.push({
          field: 'metric',
          message: 'metric must be between 1 and 50 characters long',
        });
      } else {
        req.validatedMetric = trimmedMetric;
      }
    }
  }

  // 7. Validate sort
  if (query.sort !== undefined && query.sort !== null && query.sort !== '') {
    const lowerSort = query.sort.toString().toLowerCase().trim();
    if (!ALLOWED_SORTS.has(lowerSort)) {
      errors.push({
        field: 'sort',
        message: "sort must be either 'asc' or 'desc'",
      });
    } else {
      req.validatedSort = lowerSort;
    }
  } else {
    req.validatedSort = 'desc';
  }

  if (errors.length > 0) {
    return next(new AppError('Invalid query parameters for telemetry retrieval', 400, errors));
  }

  return next();
}
