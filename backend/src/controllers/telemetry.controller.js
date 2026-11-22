import { deviceService } from '../services/device.service.js';
import { telemetryService } from '../services/telemetry.service.js';
import { AppError } from '../utils/AppError.js';

/**
 * Ingest single or batch telemetry data.
 * POST /api/telemetry or POST /api/telemetry/ingest
 */
export function ingestTelemetry(req, res) {
  if (req.isBatchTelemetry) {
    const records = telemetryService.ingestBatch(req.validatedTelemetry);
    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Batch telemetry data ingested successfully',
      count: records.length,
      data: records,
    });
  }

  const record = telemetryService.ingest(req.validatedTelemetry);
  return res.status(201).json({
    success: true,
    status: 'success',
    message: 'Telemetry data ingested successfully',
    data: record,
  });
}

/**
 * Primary telemetry retrieval endpoint with device-wise filtering and query validation.
 * GET /api/telemetry
 * GET /api/telemetry/:deviceId
 * Supports: deviceId, startDate/from, endDate/to, metric, sort, limit, page.
 */
export function getTelemetry(req, res, next) {
  const deviceId =
    req.normalizedDeviceId ||
    (req.params.deviceId ? req.params.deviceId.trim().toUpperCase() : null) ||
    (req.query.deviceId ? req.query.deviceId.trim().toUpperCase() : null);

  if (deviceId) {
    const device = deviceService.getById(deviceId);
    if (!device) {
      return next(new AppError(`Device with ID "${deviceId}" not found`, 404));
    }
  }

  const options = {
    deviceId,
    startDate: req.validatedStartDate,
    endDate: req.validatedEndDate,
    metric: req.validatedMetric,
    sort: req.validatedSort,
    limit: req.validatedLimit,
    page: req.validatedPage,
  };

  const result = telemetryService.getHistory(options);

  return res.status(200).json({
    success: true,
    status: 'ok',
    count: result.records.length,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
    data: result.records,
  });
}

/**
 * Get latest telemetry snapshot for all devices or a single device.
 * GET /api/telemetry/latest
 * GET /api/telemetry/devices/:deviceId/latest
 * GET /api/telemetry/:deviceId/latest
 */
export function getLatestTelemetry(req, res, next) {
  const rawDeviceId = req.params.deviceId || req.query.deviceId;
  const deviceId = rawDeviceId ? rawDeviceId.trim().toUpperCase() : null;

  if (deviceId) {
    const device = deviceService.getById(deviceId);
    if (!device) {
      return next(new AppError(`Device with ID "${deviceId}" not found`, 404));
    }

    const data = telemetryService.getLatest(deviceId);
    if (!data) {
      return next(new AppError(`No telemetry found for device "${deviceId}"`, 404));
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      data,
    });
  }

  const allLatest = telemetryService.getLatest();
  return res.status(200).json({
    success: true,
    status: 'ok',
    count: allLatest.length,
    data: allLatest,
  });
}

/**
 * Get recent telemetry history with optional deviceId and limit filters.
 * Alias for getTelemetry to maintain backwards compatibility.
 * GET /api/telemetry/history
 */
export function getTelemetryHistory(req, res, next) {
  return getTelemetry(req, res, next);
}

/**
 * Get runtime telemetry ingestion statistics.
 * GET /api/telemetry/stats
 */
export function getTelemetryStats(_req, res) {
  const stats = telemetryService.getStats();

  return res.status(200).json({
    success: true,
    status: 'ok',
    data: stats,
  });
}
