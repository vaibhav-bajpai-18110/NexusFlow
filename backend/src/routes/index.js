import { Router } from 'express';
import healthRoutes from './health.routes.js';
import telemetryRoutes from './telemetry.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/telemetry', telemetryRoutes);

export default router;
