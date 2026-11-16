import { Router } from 'express';
import deviceRoutes from './device.routes.js';
import healthRoutes from './health.routes.js';
import telemetryRoutes from './telemetry.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/devices', deviceRoutes);
router.use('/telemetry', telemetryRoutes);

export default router;
