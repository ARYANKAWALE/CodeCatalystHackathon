/** Base URL without trailing slash. Local dev: `/api` (Vite proxy). Production: e.g. `https://your-api.onrender.com/api` */
function apiBase() {
  const raw = import.meta.env.VITE_API_URL || '/api';
  return String(raw).replace(/\/+$/, '') || '/api';
}

function apiUrl(path) {
  const base = apiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function gatewayErrorMessage(status) {
  if (status === 502 || status === 503 || status === 504) {
    return (
      `Cannot reach the API server (HTTP ${status}). ` +
      'If you run the app locally: start the Flask backend on port 5001 (e.g. `python app.py` in backend/) ' +
      'and keep `VITE_API_URL=/api` so Vite proxies to it. ' +
      'If you use a hosted API, confirm it is awake and that `VITE_API_URL` matches your API base URL including `/api`.'
    );
  }
  return null;
}

async function readErrorMessage(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (j && typeof j.error === 'string' && j.error) return j.error;
    if (j && typeof j.message === 'string' && j.message) return j.message;
  } catch {
    /* not JSON */
  }
  const gateway = gatewayErrorMessage(res.status);
  if (gateway) return gateway;
  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (res.status === 404) {
    return snippet
      ? `Not found (${res.status}): ${snippet}`
      : `Not found (${res.status}). Check that VITE_API_URL is your API root including /api (e.g. https://host.onrender.com/api).`;
  }
  if (snippet) return `HTTP ${res.status}: ${snippet}`;
  return `Request failed (HTTP ${res.status})`;
}

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(apiUrl(url), { ...options, headers });
  } catch (e) {
    const msg =
      e && typeof e.message === 'string' && e.message
        ? e.message
        : 'Network error';
    throw new Error(
      `${msg}. Check that the backend is running and the API URL is correct (dev: backend on port 5001, frontend using /api via Vite proxy).`,
    );
  }

  if (res.status === 401) {
    const method = String(options.method || 'GET').toUpperCase();
    const publicAuthPost =
      method === 'POST' &&
      (url.includes('auth/login') ||
        url.includes('auth/forgot-password') ||
        url.includes('auth/reset-password'));
    const ct = res.headers.get('content-type') || '';
    if (publicAuthPost) {
      if (ct.includes('application/json')) {
        const data = await res.json();
        const errMsg =
          (typeof data?.error === 'string' && data.error) || 'Invalid username or password';
        throw new Error(errMsg);
      }
      throw new Error('Invalid username or password');
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (options.raw) return res;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) {
      const gw = gatewayErrorMessage(res.status);
      throw new Error(
        gw ||
          (typeof data?.error === 'string' && data.error) ||
          (typeof data?.message === 'string' && data.message) ||
          `Request failed (HTTP ${res.status})`,
      );
    }
    return data;
  }

  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (url) => request(url, { method: 'DELETE' }),
  getBlob: (url) => {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(apiUrl(url), { headers });
  },
};
