import { apiRequest } from './apiClient.js';

export async function fetchDevices({ signal } = {}) {
  const payload = await apiRequest('/devices', { signal });
  if (!Array.isArray(payload?.data)) {
    throw new Error('The device list response is missing its data array.');
  }
  return payload.data;
}

export async function fetchDevice(deviceId, { signal } = {}) {
  const payload = await apiRequest(`/devices/${encodeURIComponent(deviceId)}`, { signal });
  if (!payload?.data || typeof payload.data !== 'object') {
    throw new Error('The device details response is missing its data record.');
  }
  return payload.data;
}

export async function registerDevice(device, { signal } = {}) {
  const payload = await apiRequest('/devices', {
    method: 'POST',
    signal,
    body: JSON.stringify(device),
  });
  if (!payload?.data || typeof payload.data !== 'object') {
    throw new Error('The registration response is missing its device record.');
  }
  return payload.data;
}
