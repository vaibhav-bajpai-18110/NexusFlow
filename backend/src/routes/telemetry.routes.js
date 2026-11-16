import { Router } from 'express';
import {
  getLatestTelemetry,
  getTelemetryHistory,
  getTelemetryStats,
  ingestTelemetry,
} from '../controllers/telemetry.controller.js';
import { validateTelemetry } from '../middleware/validateTelemetry.js';

const router = Router();

// Ingestion endpoints
router.post('/', validateTelemetry, ingestTelemetry);
router.post('/ingest', validateTelemetry, ingestTelemetry);

// Query endpoints
router.get('/', getLatestTelemetry);
router.get('/latest', getLatestTelemetry);
router.get('/history', getTelemetryHistory);
router.get('/stats', getTelemetryStats);
router.get('/devices/:deviceId/latest', getLatestTelemetry);
router.get('/:deviceId', getLatestTelemetry);

export default router;
