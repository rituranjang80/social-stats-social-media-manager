/* ============================================================================
 * Tracks user activity; warns before idle logout; refreshes JWT while active.
 * ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import sessionIdleConfig from '../config/sessionIdle';
import { playIdleBeep } from '../utils/idleBeep';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
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
  const lastBeepMinuteRef = useRef(-1);
  const loggingOutRef = useRef(false);

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const bumpActivity = useCallback((fromWarningContinue = false) => {
    const now = Date.now();
    lastActivityRef.current = now;
    if (fromWarningContinue || warningOpenRef.current) {
      warningOpenRef.current = false;
      setWarningOpen(false);
      lastBeepMinuteRef.current = -1;
    }
  }, []);

  const continueWorking = useCallback(() => {
    bumpActivity(true);
  }, [bumpActivity]);

  const performLogout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    warningOpenRef.current = false;
    setWarningOpen(false);
    onLogout?.();
    navigate('/login', { replace: true });
  }, [navigate, onLogout]);

  // Activity listeners + throttled JWT refresh while working
  useEffect(() => {
    if (!active || !cfg.enabled) return undefined;

    lastActivityRef.current = Date.now();
    lastTokenRefreshRef.current = Date.now();
    loggingOutRef.current = false;

    let throttleTimer = null;
    const onActivity = () => {
      if (warningOpenRef.current) return;
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
      }, 1000);
      lastActivityRef.current = Date.now();

      const sinceRefresh = Date.now() - lastTokenRefreshRef.current;
      if (sinceRefresh >= cfg.tokenRefreshMs) {
        lastTokenRefreshRef.current = Date.now();
        refreshAccessTokenSilently().catch(() => {});
      }
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [active, cfg.enabled, cfg.tokenRefreshMs]);

  // Idle tick (1s)
  useEffect(() => {
    if (!active || !cfg.enabled) return undefined;

    const tick = () => {
      const idleMs = Date.now() - lastActivityRef.current;
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
          if (cfg.beepEnabled) playIdleBeep();
        } else if (cfg.beepEnabled && remainingSeconds > 0 && remainingSeconds % 60 === 0) {
          const bucket = Math.floor(remainingSeconds / 60);
          if (bucket !== lastBeepMinuteRef.current) {
            lastBeepMinuteRef.current = bucket;
            playIdleBeep();
          }
        }
      } else {
        if (warningOpenRef.current) {
          warningOpenRef.current = false;
          setWarningOpen(false);
        }
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, cfg.enabled, cfg.idleTimeoutMs, cfg.warningAtMs, cfg.beepEnabled, performLogout]);

  return {
    enabled: cfg.enabled && active,
    warningOpen,
    remainingSeconds,
    remainingLabel: formatCountdown(remainingSeconds),
    continueWorking,
    idleTimeoutMinutes: cfg.idleTimeoutMinutes,
    warningMinutes: cfg.warningMinutes,
  };
}

export default useIdleSession;
