/* ============================================================================
 * Tracks user activity; warns before idle logout; refreshes JWT while active.
 * ========================================================================== */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import sessionIdleConfig from '../config/sessionIdle';
import { playIdleBeep } from '../utils/idleBeep';

/** Deliberately omit scroll/wheel — they fire from layout/polling and block idle detection. */
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'pointerdown'];

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
  const lastBeepSecondRef = useRef(-1);
  const loggingOutRef = useRef(false);
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;

  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const continueWorking = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningOpenRef.current = false;
    lastBeepSecondRef.current = -1;
    setWarningOpen(false);
  }, []);

  const performLogout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    warningOpenRef.current = false;
    setWarningOpen(false);
    onLogoutRef.current?.();
    navigate('/login', { replace: true });
  }, [navigate]);

  // Activity listeners + throttled JWT refresh while working
  useEffect(() => {
    if (!active || !cfg.enabled) return undefined;

    loggingOutRef.current = false;
    lastActivityRef.current = Date.now();
    lastTokenRefreshRef.current = Date.now();

    let throttleUntil = 0;
    const onActivity = () => {
      if (warningOpenRef.current) return;
      const now = Date.now();
      if (now < throttleUntil) return;
      throttleUntil = now + 800;
      lastActivityRef.current = now;

      const sinceRefresh = now - lastTokenRefreshRef.current;
      if (sinceRefresh >= cfg.tokenRefreshMs) {
        lastTokenRefreshRef.current = now;
        refreshAccessTokenSilently().catch(() => {});
      }
    };

    ACTIVITY_EVENTS.forEach((ev) => {
      window.addEventListener(ev, onActivity, { capture: true, passive: true });
    });
    return () => {
      ACTIVITY_EVENTS.forEach((ev) => {
        window.removeEventListener(ev, onActivity, { capture: true });
      });
    };
  }, [active, cfg.enabled, cfg.tokenRefreshMs]);

  // Idle tick (1s) — stable deps (no onLogout)
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
          lastBeepSecondRef.current = sec;
          if (cfg.beepEnabled) playIdleBeep();
        } else if (cfg.beepEnabled && sec !== lastBeepSecondRef.current && sec > 0 && sec % 30 === 0) {
          lastBeepSecondRef.current = sec;
          playIdleBeep();
        }
      } else if (warningOpenRef.current) {
        warningOpenRef.current = false;
        setWarningOpen(false);
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
