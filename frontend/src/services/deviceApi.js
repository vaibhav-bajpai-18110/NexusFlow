const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function formatApiError(payload, fallback) {
  const message = payload?.message || fallback;
  const details = Array.isArray(payload?.details)
    ? payload.details.map((detail) => detail?.message).filter(Boolean).join(' ')
    : '';
  return details ? `${message} ${details}` : message;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the NexusFlow API. Check that the backend is running.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(response.ok ? 'The API returned an unreadable response.' : `Request failed (${response.status}).`);
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(formatApiError(payload, `Request failed (${response.status}).`));
  }

  return payload;
}

export async function fetchDevices({ signal } = {}) {
  const payload = await request('/devices', { signal });
  if (!Array.isArray(payload?.data)) {
    throw new Error('The device list response is missing its data array.');
  }
  return payload.data;
}

export async function fetchDevice(deviceId, { signal } = {}) {
  const payload = await request(`/devices/${encodeURIComponent(deviceId)}`, { signal });
  if (!payload?.data || typeof payload.data !== 'object') {
    throw new Error('The device details response is missing its data record.');
  }
  return payload.data;
}

export async function registerDevice(device, { signal } = {}) {
  const payload = await request('/devices', {
    method: 'POST',
    signal,
    body: JSON.stringify(device),
  });
  if (!payload?.data || typeof payload.data !== 'object') {
    throw new Error('The registration response is missing its device record.');
  }
  return payload.data;
}
