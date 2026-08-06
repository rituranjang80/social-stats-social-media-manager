/* ============================================================================
 * Idle session — client-side inactivity logout (configurable via REACT_APP_*).
 * Minutes and optional *_SECONDS (seconds win when set) for fine-grained tests.
 * Restart `npm start` / rebuild frontend after .env changes.
 * ========================================================================== */

const truthy = (v) => {
  if (v == null || v === '') return undefined;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
};

const parsePositiveInt = (raw, fallback) => {
  const n = parseInt(String(raw ?? '').trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseOptionalSeconds = (raw) => {
  if (raw == null || String(raw).trim() === '') return null;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const enabled = truthy(process.env.REACT_APP_IDLE_SESSION_ENABLED) ?? true;

const idleTimeoutMs = (() => {
  const sec = parseOptionalSeconds(process.env.REACT_APP_IDLE_TIMEOUT_SECONDS);
  if (sec != null) return sec * 1000;
  const min = parsePositiveInt(process.env.REACT_APP_IDLE_TIMEOUT_MINUTES, 20);
  return min * 60 * 1000;
})();

const warningLeadMs = (() => {
  const sec = parseOptionalSeconds(process.env.REACT_APP_IDLE_WARNING_SECONDS);
  if (sec != null) return sec * 1000;
  const min = parsePositiveInt(process.env.REACT_APP_IDLE_WARNING_MINUTES, 5);
  return min * 60 * 1000;
})();

const usesSecondsOverride = parseOptionalSeconds(process.env.REACT_APP_IDLE_TIMEOUT_SECONDS) != null
  || parseOptionalSeconds(process.env.REACT_APP_IDLE_WARNING_SECONDS) != null;

const beepEnabled = truthy(process.env.REACT_APP_IDLE_BEEP) ?? true;

const tokenRefreshMinutes = parsePositiveInt(process.env.REACT_APP_IDLE_TOKEN_REFRESH_MINUTES, 10);

/** At least 1s of warning window before hard logout. */
const warningLeadClampedMs = Math.min(
  Math.max(warningLeadMs, 1000),
  Math.max(idleTimeoutMs - 1000, 1000),
);

const warningAtMs = Math.max(0, idleTimeoutMs - warningLeadClampedMs);

export const sessionIdleConfig = Object.freeze({
  enabled,
  idleTimeoutMs,
  warningLeadMs: warningLeadClampedMs,
  warningAtMs,
  beepEnabled,
  tokenRefreshMs: tokenRefreshMinutes * 60 * 1000,
  idleTimeoutMinutes: Math.ceil(idleTimeoutMs / 60000),
  warningMinutes: Math.ceil(warningLeadClampedMs / 60000),
  warningSeconds: Math.ceil(warningLeadClampedMs / 1000),
});

if (process.env.NODE_ENV === 'development' && enabled) {
  // eslint-disable-next-line no-console
  console.info('[idle-session]', {
    idleTimeoutMs: sessionIdleConfig.idleTimeoutMs,
    warningAtMs: sessionIdleConfig.warningAtMs,
    warningLeadMs: sessionIdleConfig.warningLeadMs,
    usesSecondsOverride,
    note: usesSecondsOverride
      ? 'REACT_APP_IDLE_*_SECONDS override minutes — remove *_SECONDS to use MINUTES only'
      : undefined,
  });
}

export default sessionIdleConfig;
