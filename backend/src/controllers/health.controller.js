import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { websocketService } from '../services/websocket.service.js';

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
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    websocket: websocketService.getStats(),
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    memoryUsageMB: {
      rss: toMB(memory.rss),
      heapTotal: toMB(memory.heapTotal),
      heapUsed: toMB(memory.heapUsed),
    },
  });
}
