/* ============================================================================
 * Tracks user activity; warns before idle logout; refreshes JWT while active.
 * Popup only when the tab is visible/focused and there is no real user activity.
 * ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import sessionIdleConfig from '../config/sessionIdle';
import { playIdleBeep } from '../utils/idleBeep';

/** Immediate activity — clicks, keys, taps. */
const DIRECT_ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'pointerdown', 'click', 'input'];

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function isTabEngaged() {
  if (typeof document === 'undefined') return true;
  return !document.hidden && document.visibilityState === 'visible';
}

async function refreshAccessTokenSilently() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return;
  const base = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
  const res = await axios.post(`${base}/auth/refresh/`, { refresh });
  if (res.data?.access) localStorage.setItem('access_token', res.data.access);
  if (res.data?.refresh) localStorage.setItem('refresh_token', res.data.refresh);
}

/**
 * @param {object} opts
 * @param {boolean} opts.active — run timers when true (signed-in user)
 * @param {() => void} opts.onLogout
 */
export function useIdleSession({ active, onLogout }) {
  const navigate = useNavigate();
  const cfg = sessionIdleConfig;
  const lastActivityRef = useRef(Date.now());
  const lastTokenRefreshRef = useRef(Date.now());
  const warningOpenRef = useRef(false);
  const lastBeepSecondRef = useRef(-1);
  const loggingOutRef = useRef(false);
  const hiddenAtRef = useRef(null);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const dismissWarning = useCallback(() => {
    if (!warningOpenRef.current) return;
    warningOpenRef.current = false;
    lastBeepSecondRef.current = -1;
    setWarningOpen(false);
  }, []);

  const recordActivity = useCallback((opts = {}) => {
    const { refreshToken = true } = opts;
    const now = Date.now();
    lastActivityRef.current = now;
    dismissWarning();

    if (!refreshToken) return;
    const sinceRefresh = now - lastTokenRefreshRef.current;
    if (sinceRefresh >= cfg.tokenRefreshMs) {
      lastTokenRefreshRef.current = now;
      refreshAccessTokenSilently().catch(() => {});
    }
  }, [cfg.tokenRefreshMs, dismissWarning]);

  const continueWorking = useCallback(() => {
    recordActivity();
  }, [recordActivity]);

  const performLogout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    dismissWarning();
    onLogoutRef.current?.();
    navigate('/login', { replace: true });
  }, [navigate, dismissWarning]);

  const getIdleMs = useCallback(() => {
    const now = Date.now();
    if (hiddenAtRef.current != null) {
      return hiddenAtRef.current - lastActivityRef.current;
    }
    return now - lastActivityRef.current;
  }, []);

  // Activity listeners
  useEffect(() => {
    if (!active || !cfg.enabled) return undefined;

    loggingOutRef.current = false;
    lastActivityRef.current = Date.now();
    lastTokenRefreshRef.current = Date.now();
    hiddenAtRef.current = null;

    let directThrottleUntil = 0;
    let moveThrottleUntil = 0;

    const onDirectActivity = () => {
      const now = Date.now();
      if (now < directThrottleUntil) return;
      directThrottleUntil = now + 400;
      recordActivity();
    };

    const onMouseMove = () => {
      const now = Date.now();
      if (now < moveThrottleUntil) return;
      moveThrottleUntil = now + 2500;
      recordActivity({ refreshToken: false });
    };

    const onFocusIn = () => {
      recordActivity({ refreshToken: false });
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        dismissWarning();
        return;
      }
      if (hiddenAtRef.current != null) {
        const hiddenFor = Date.now() - hiddenAtRef.current;
        lastActivityRef.current += hiddenFor;
        hiddenAtRef.current = null;
      }
      recordActivity({ refreshToken: false });
    };

    DIRECT_ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, onDirectActivity, { capture: true, passive: true });
    });
    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('focusin', onFocusIn, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      DIRECT_ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, onDirectActivity, { capture: true });
      });
      window.removeEventListener('mousemove', onMouseMove, { capture: true });
      window.removeEventListener('focusin', onFocusIn, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, cfg.enabled, recordActivity, dismissWarning]);

  // Idle tick (1s)
  useEffect(() => {
    if (!active || !cfg.enabled) return undefined;

    const tick = () => {
      if (!isTabEngaged()) {
        dismissWarning();
        return;
      }

      const idleMs = getIdleMs();
      const remainingMs = cfg.idleTimeoutMs - idleMs;

      if (remainingMs <= 0) {
        performLogout();
        return;
      }

      if (idleMs >= cfg.warningAtMs) {
        const sec = Math.ceil(remainingMs / 1000);
        setRemainingSeconds(sec);
        if (!warningOpenRef.current) {
          warningOpenRef.current = true;
          setWarningOpen(true);
          lastBeepSecondRef.current = sec;
          if (cfg.beepEnabled) playIdleBeep();
        } else if (cfg.beepEnabled && sec !== lastBeepSecondRef.current && sec > 0 && sec % 30 === 0) {
          lastBeepSecondRef.current = sec;
          playIdleBeep();
        }
      } else {
        dismissWarning();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [
    active,
    cfg.enabled,
    cfg.idleTimeoutMs,
    cfg.warningAtMs,
    cfg.beepEnabled,
    performLogout,
    getIdleMs,
    dismissWarning,
  ]);

  return {
    enabled: cfg.enabled && active,
    warningOpen,
    remainingSeconds,
    remainingLabel: formatCountdown(remainingSeconds),
    continueWorking,
    warningMinutes: cfg.warningMinutes,
    warningSeconds: cfg.warningSeconds,
  };
}

export default useIdleSession;
