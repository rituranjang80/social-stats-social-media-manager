/* ============================================================================
 *  Report React / browser errors to POST /api/errors/client-report/ (+ screenshot)
 * ========================================================================== */
import html2canvas from 'html2canvas';
import axios from 'axios';
import { useAppStore } from '../stores/appStore';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function reportingEnabled() {
  const flag = process.env.REACT_APP_CLIENT_ERROR_REPORTING;
  if (flag === '0' || flag === 'false') return false;
  return flag !== 'false';
}

function screenshotsEnabled() {
  const flag = process.env.REACT_APP_ERROR_SCREENSHOTS;
  if (flag === '0' || flag === 'false') return false;
  return true;
}

const recentKeys = new Map();
const DEDUP_MS = 30_000;

function dedupKey(err, source) {
  const msg = String(err?.message || err || '').slice(0, 200);
  const stack = String(err?.stack || '').slice(0, 200);
  return `${source}|${msg}|${stack}|${window.location.pathname}`;
}

function shouldSend(key) {
  const now = Date.now();
  const prev = recentKeys.get(key);
  if (prev && now - prev < DEDUP_MS) return false;
  recentKeys.set(key, now);
  return true;
}

async function capturePageScreenshot() {
  if (!screenshotsEnabled() || typeof document === 'undefined') return null;
  try {
    const canvas = await html2canvas(document.body, {
      logging: false,
      scale: Math.min(1, window.devicePixelRatio || 1),
      useCORS: true,
      allowTaint: false,
      ignoreElements: (el) => el?.tagName === 'IFRAME',
    });
    return canvas.toDataURL('image/png', 0.72);
  } catch {
    return null;
  }
}

function workspaceIdForReport() {
  try {
    const state = useAppStore.getState();
    return state.currentClient?.publicId
      || state.currentClient?.public_id
      || state.currentClientId
      || null;
  } catch {
    return null;
  }
}

/**
 * @param {object} opts
 * @param {Error|string} opts.error
 * @param {object} [opts.errorInfo] React errorInfo
 * @param {string} [opts.source] error_boundary | window.onerror | unhandledrejection
 * @param {string} [opts.referenceId]
 * @param {boolean} [opts.captureScreenshot]
 */
export async function reportClientError({
  error,
  errorInfo = null,
  source = 'frontend',
  referenceId = '',
  captureScreenshot = true,
} = {}) {
  if (!reportingEnabled()) return null;

  const err = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
  const key = dedupKey(err, source);
  if (!shouldSend(key)) return null;

  let screenshot = null;
  if (captureScreenshot) {
    screenshot = await capturePageScreenshot();
  }

  const payload = {
    message: err.message,
    stack: err.stack || '',
    component_stack: errorInfo?.componentStack || '',
    exception_type: err.name || 'FrontendError',
    source,
    reference_id: referenceId,
    url: window.location.href,
    pathname: window.location.pathname,
    severity: 'ERROR',
    workspace_id: workspaceIdForReport(),
    viewport: {
      w: window.innerWidth,
      h: window.innerHeight,
    },
    build: {
      node_env: process.env.NODE_ENV,
      app: process.env.REACT_APP_ERROR_REPORTING_APP || 'social-stats-spa',
    },
  };
  if (screenshot) {
    payload.screenshot_png_base64 = screenshot;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('access_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await axios.post(`${API_BASE}/errors/client-report/`, payload, {
      headers,
      timeout: 25_000,
      validateStatus: (s) => s === 201 || s === 204,
    });
    return res.data?.error_id || null;
  } catch {
    return null;
  }
}

export function installGlobalClientErrorHandlers() {
  if (!reportingEnabled() || typeof window === 'undefined') return () => {};

  const onError = (event) => {
    const err = event.error || new Error(event.message || 'Script error');
    reportClientError({ error: err, source: 'window.onerror' });
  };

  const onRejection = (event) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : new Error(String(reason));
    reportClientError({ error: err, source: 'unhandledrejection' });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
