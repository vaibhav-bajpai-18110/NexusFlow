import path from 'node:path';
import dotenv from 'dotenv';

// Load .env from the backend root regardless of where the process is started from.
const envFilePath = path.resolve(import.meta.dirname, '../../.env');
dotenv.config({ path: envFilePath });

function parsePort(rawPort, fallback = 5000) {
  if (rawPort === undefined || rawPort === '') {
    return fallback;
  }

  const parsed = Number(rawPort);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`Invalid PORT environment variable: "${rawPort}"`);
  }

  return parsed;
}

function parseNumber(raw, fallback) {
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = Object.freeze({
  nodeEnv,
  port: parsePort(process.env.PORT, 5000),
  serviceName: process.env.SERVICE_NAME || 'nexusflow-backend',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  maxTelemetryBuffer: parseNumber(process.env.MAX_TELEMETRY_BUFFER, 1000),
  mongoUri: process.env.MONGODB_URI || '',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
});

