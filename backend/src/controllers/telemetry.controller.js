import { telemetryService } from '../services/telemetry.service.js';
import { flushPersistence } from '../services/persistence.service.js';

/**
 * Ingest single or batch telemetry data.
 * POST /api/telemetry or POST /api/telemetry/ingest
 */
export async function ingestTelemetry(req, res, next) {
  try {
    if (req.isBatchTelemetry) {
      const records = telemetryService.ingestBatch(req.validatedTelemetry);
      await flushPersistence();

      return res.status(201).json({
        success: true,
        status: 'success',
        message: 'Batch telemetry data ingested successfully',
        count: records.length,
        data: records,
      });
    }

    const record = telemetryService.ingest(req.validatedTelemetry);
    await flushPersistence();

    return res.status(201).json({
      success: true,
      status: 'success',
      message: 'Telemetry data ingested successfully',
      data: record,
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Get latest telemetry data for all devices or a single device.
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
 * Get recent telemetry history.
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
 * Get telemetry ingestion statistics.
 */
export function getTelemetryStats(_req, res) {
  const stats = telemetryService.getStats();

  return res.status(200).json({
    success: true,
    status: 'ok',
    data: stats,
  });
}
