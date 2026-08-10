/* Axios client, JWT refresh, workspace interceptors — @app/core/api */
import axios from 'axios';
import { useAppStore } from '../../stores/appStore';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export function apiBaseUrl() {
  return API_BASE;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export async function refreshSessionTokens(refreshToken) {
  const refresh = refreshToken || localStorage.getItem('refresh_token');
  if (!refresh) {
    const err = new Error('no_refresh_token');
    err.code = 'NO_REFRESH';
    throw err;
  }
  const res = await axios.post(`${API_BASE}/auth/refresh/`, { refresh });
  if (res.data?.access) localStorage.setItem('access_token', res.data.access);
  if (res.data?.refresh) localStorage.setItem('refresh_token', res.data.refresh);
  return res.data;
}

let refreshInFlight = null;

function refreshSessionOnce() {
  if (!refreshInFlight) {
    refreshInFlight = refreshSessionTokens().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

const WORKSPACE_SKIP_PATH_RE = /\/(auth|token|schema|docs|redoc)(\/|$)/i;
const WORKSPACE_SKIP_EXACT_RE = /^\/?clients\/?$/i;
const WORKSPACE_SKIP_INVITATION_RE = /^\/invitations\/[0-9a-f-]{36}(\/accept\/)?\/?$/i;

function shouldAttachWorkspace(config) {
  if (config?.skipWorkspace) return false;
  const url = String(config?.url || '').split('?')[0];
  if (WORKSPACE_SKIP_PATH_RE.test(url)) return false;
  if (WORKSPACE_SKIP_EXACT_RE.test(url.replace(/^\/api/, ''))) return false;
  if (WORKSPACE_SKIP_INVITATION_RE.test(url)) return false;
  return true;
}

function getActiveWorkspaceId() {
  try {
    const state = useAppStore.getState();
    const fromClient = state.currentClient?.publicId || state.currentClient?.public_id;
    if (fromClient) return String(fromClient);
    return state.currentClientId || null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  if (!config.skipAuth) {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  if (!shouldAttachWorkspace(config)) return config;

  const workspaceId = getActiveWorkspaceId();
  if (!workspaceId) return config;

  config.headers = config.headers || {};
  config.headers['X-Client-Id'] = String(workspaceId);
  config.headers['X-Workspace-Id'] = String(workspaceId);

  config.params = { ...(config.params || {}) };
  if (config.params.client_id == null && config.params.workspace_id == null) {
    config.params.client_id = workspaceId;
  }

  const method = String(config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch'].includes(method) && config.data != null) {
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (!config.data.has('client') && !config.data.has('client_id')) {
        config.data.append('client', String(workspaceId));
      }
    } else if (typeof config.data === 'object' && !Array.isArray(config.data)) {
      if (config.data.client == null && config.data.client_id == null) {
        config.data = { ...config.data, client: workspaceId };
      }
    }
  }

  return config;
});

const PUBLIC_PATH_PREFIXES = [
  '/login', '/signup', '/auth/end-user', '/verify-email', '/forgot-password',
  '/reset-password', '/oauth/callback', '/auth/callback', '/invite/',
  '/agency-invite/', '/invitation/', '/accept-invitation/', '/report/',
];

function _redirectToLogin() {
  try { localStorage.clear(); } catch { /* ignore */ }
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p))) return;
  window.location.href = '/login';
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      error.errorId = data.error_id || data.errorId || null;
      error.userMessage =
        data.message ||
        (typeof data.detail === 'string' ? data.detail : null) ||
        error.message;
      error.errorTimestamp = data.timestamp || null;
    }
    const original = error.config;
    const url = String(original?.url || '');
    if (url.includes('/auth/refresh/')) {
      return Promise.reject(error);
    }
    if (error.response?.status !== 401 || original?._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      return Promise.reject(error);
    }

    try {
      await refreshSessionOnce();
      const access = localStorage.getItem('access_token');
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch {
      _redirectToLogin();
      return Promise.reject(error);
    }
  },
);

/** Unauthenticated axios instance (public reports, lookups). */
export const publicApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export default api;
