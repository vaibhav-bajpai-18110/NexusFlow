import { env } from '../config/env.js';

/**
 * Returns service health and runtime metadata.
 */
export function getHealth(_req, res) {
  const memory = process.memoryUsage();
  const toMB = (bytes) => Number((bytes / (1024 * 1024)).toFixed(2));

  res.status(200).json({
    success: true,
    status: 'ok',
    service: env.serviceName,
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    memoryUsageMB: {
      rss: toMB(memory.rss),
      heapTotal: toMB(memory.heapTotal),
      heapUsed: toMB(memory.heapUsed),
    },
  });
}
