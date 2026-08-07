/* ============================================================================
 * Idle session — client-side inactivity logout (configurable via REACT_APP_*).
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

const enabled = truthy(process.env.REACT_APP_IDLE_SESSION_ENABLED) ?? true;

/** Total idle time before sign-out (minutes). */
const idleTimeoutMinutes = parsePositiveInt(process.env.REACT_APP_IDLE_TIMEOUT_MINUTES, 20);

/** Show warning dialog this many minutes before sign-out. */
const warningMinutes = parsePositiveInt(process.env.REACT_APP_IDLE_WARNING_MINUTES, 5);

/** Play a short beep when the warning opens (and each minute while open). */
const beepEnabled = truthy(process.env.REACT_APP_IDLE_BEEP) ?? true;

/** While the user is active, refresh JWT at most this often (minutes). */
const tokenRefreshMinutes = parsePositiveInt(process.env.REACT_APP_IDLE_TOKEN_REFRESH_MINUTES, 10);

const warningMinutesClamped = Math.min(warningMinutes, idleTimeoutMinutes - 1);

export const sessionIdleConfig = Object.freeze({
  enabled,
  idleTimeoutMs: idleTimeoutMinutes * 60 * 1000,
  warningLeadMs: warningMinutesClamped * 60 * 1000,
  warningAtMs: (idleTimeoutMinutes - warningMinutesClamped) * 60 * 1000,
  beepEnabled,
  tokenRefreshMs: tokenRefreshMinutes * 60 * 1000,
  idleTimeoutMinutes,
  warningMinutes: warningMinutesClamped,
});

export default sessionIdleConfig;
