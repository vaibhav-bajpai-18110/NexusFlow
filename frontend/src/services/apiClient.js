const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function formatApiError(payload, fallback) {
  const message = payload?.message || fallback;
  const details = Array.isArray(payload?.details)
    ? payload.details.map((detail) => detail?.message).filter(Boolean).join(' ')
    : '';
  return details ? `${message} ${details}` : message;
}

export async function apiRequest(path, options = {}) {
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
