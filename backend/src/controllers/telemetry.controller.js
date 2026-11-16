import { telemetryService } from '../services/telemetry.service.js';

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
 * Get latest telemetry data for all devices or a single device.
 * GET /api/telemetry/latest or GET /api/telemetry/devices/:deviceId/latest
 */
export function getLatestTelemetry(req, res) {
  const deviceId = req.params.deviceId || req.query.deviceId;
  const data = telemetryService.getLatest(deviceId);

  if (deviceId && !data) {
    return res.status(404).json({
      success: false,
      status: 'fail',
      message: `No telemetry found for device "${deviceId}"`,
    });
  }

  return res.status(200).json({
    success: true,
    status: 'ok',
    data,
  });
}

/**
 * Get recent telemetry history with optional deviceId and limit filters.
 * GET /api/telemetry/history?deviceId=TURBINE_001&limit=20
 */
export function getTelemetryHistory(req, res) {
  const { deviceId, limit } = req.query;
  const history = telemetryService.getHistory({ deviceId, limit });

  return res.status(200).json({
    success: true,
    status: 'ok',
    count: history.length,
    data: history,
  });
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
