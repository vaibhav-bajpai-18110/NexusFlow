import { Router } from 'express';
import {
  getLatestTelemetry,
  getTelemetry,
  getTelemetryHistory,
  getTelemetryStats,
  ingestTelemetry,
} from '../controllers/telemetry.controller.js';
import { validateTelemetry } from '../middleware/validateTelemetry.js';
import { validateTelemetryQuery } from '../middleware/validateTelemetryQuery.js';

const router = Router();

// Ingestion endpoints
router.post('/', validateTelemetry, ingestTelemetry);
router.post('/ingest', validateTelemetry, ingestTelemetry);

// Named query endpoints (placed before parameter routes)
router.get('/latest', validateTelemetryQuery, getLatestTelemetry);
router.get('/history', validateTelemetryQuery, getTelemetryHistory);
router.get('/stats', getTelemetryStats);
router.get('/devices/:deviceId/latest', validateTelemetryQuery, getLatestTelemetry);
router.get('/devices/:deviceId', validateTelemetryQuery, getTelemetry);

// Device-wise parameter routes
router.get('/:deviceId/latest', validateTelemetryQuery, getLatestTelemetry);
router.get('/:deviceId', validateTelemetryQuery, getTelemetry);

// Primary retrieval endpoint
router.get('/', validateTelemetryQuery, getTelemetry);

export default router;
