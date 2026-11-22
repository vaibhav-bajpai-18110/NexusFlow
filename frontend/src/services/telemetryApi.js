import { apiRequest } from './apiClient.js';

export async function fetchLatestTelemetry({ deviceId, signal } = {}) {
  const query = new URLSearchParams();
  if (deviceId) query.set('deviceId', deviceId);
  const suffix = query.size ? `?${query.toString()}` : '';
  const payload = await apiRequest(`/telemetry/latest${suffix}`, { signal });

  if (payload?.data == null) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (typeof payload.data === 'object') return [payload.data];
  throw new Error('The latest telemetry response has an invalid data value.');
}

export async function fetchTelemetryHistory({ deviceId, limit = 50, signal } = {}) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (deviceId) query.set('deviceId', deviceId);
  const payload = await apiRequest(`/telemetry/history?${query.toString()}`, { signal });

  if (!Array.isArray(payload?.data)) {
    throw new Error('The telemetry history response is missing its data array.');
  }
  return payload.data;
}
