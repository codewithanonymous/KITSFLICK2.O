function normalizeBaseUrl(value = '') {
  return String(value).trim().replace(/\/+$/, '');
}

function resolveApiBase() {
  const configured = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '');
  if (configured) {
    return configured;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const { hostname, port, protocol } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  // Local Vite frontend (5173) -> local backend (5000)
  if (isLocalHost && port && port !== '5000') {
    return `${protocol}//${hostname}:5000`;
  }

  // Production same-origin fallback
  return '';
}

const API = resolveApiBase();
const DEBUG_HTTP = import.meta.env.VITE_DEBUG_HTTP === 'true';

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data.message || 'Request failed';
    throw new Error(message);
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const url = `${API}${path}`;

  if (DEBUG_HTTP) {
    console.log(`[FE][REQ] ${method} ${url}`);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (DEBUG_HTTP) {
      console.error(`[FE][NET_ERR] ${method} ${url}`, error);
    }
    throw error;
  }

  if (DEBUG_HTTP) {
    console.log(`[FE][RES] ${method} ${url} -> ${response.status}`);
  }

  return parseResponse(response);
}

export function apiJson(path, method, payload, token) {
  return apiRequest(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export function apiForm(path, formData, token, method = 'POST') {
  return apiRequest(path, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
}
