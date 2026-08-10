/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ALL_THEME_IDS,
  isExtendedTheme,
  themeIsDark,
} from '../config/appThemes';
import { applyBrandingCssVariables } from '../config/branding';

/**
 * Theme management — one preference drives `<html data-theme="…">` for the whole app.
 *
 *  - light | dark | system (system resolves to light/dark on the document)
 *  - ocean | violet | emerald | sunset | rose | indigo | midnight (full palettes in app-themes.css)
 */

const STORAGE_KEY = 'theme';
const DEFAULT_PREFERENCE = 'light';

function readPref() {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE;
  const v = window.localStorage?.getItem(STORAGE_KEY);
  return ALL_THEME_IDS.has(v) ? v : DEFAULT_PREFERENCE;
}

function systemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Value written to data-theme (extended themes keep their id). */
function resolveDocumentTheme(preference) {
  if (preference === 'system') return systemTheme();
  if (isExtendedTheme(preference)) return preference;
  return preference;
}

function resolveColorScheme(preference, documentTheme) {
  if (preference === 'dark' || documentTheme === 'dark') return 'dark';
  if (isExtendedTheme(preference)) {
    return themeIsDark(preference, documentTheme) ? 'dark' : 'light';
  }
  return 'light';
}

export function applyThemePreference(preference) {
  if (typeof document === 'undefined') return;
  const documentTheme = resolveDocumentTheme(preference);
  const colorScheme = resolveColorScheme(preference, documentTheme);
  document.documentElement.setAttribute('data-theme', documentTheme);
  document.documentElement.style.colorScheme = colorScheme;
  applyBrandingCssVariables();
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readPref);
  const [documentTheme, setDocumentTheme] = useState(() => resolveDocumentTheme(readPref()));

  useEffect(() => {
    const docTheme = resolveDocumentTheme(preference);
    setDocumentTheme(docTheme);
    applyThemePreference(preference);
    try { window.localStorage.setItem(STORAGE_KEY, preference); } catch { /* ignore */ }
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const docTheme = systemTheme();
      setDocumentTheme(docTheme);
      document.documentElement.setAttribute('data-theme', docTheme);
      document.documentElement.style.colorScheme = docTheme;
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, [preference]);

  const isDark = themeIsDark(preference, documentTheme);

  const toggle = useCallback(() => {
    setPreference((p) => {
      if (isExtendedTheme(p)) {
        return themeIsDark(p, p) ? 'light' : 'dark';
      }
      const resolved = p === 'system' ? systemTheme() : p;
      return resolved === 'dark' ? 'light' : 'dark';
    });
  }, []);

  const setTheme = useCallback((value) => {
    if (ALL_THEME_IDS.has(value)) setPreference(value);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      theme: documentTheme,
      isDark,
      toggle,
      setTheme,
    }),
    [preference, documentTheme, isDark, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  const pref = readPref();
  const doc = resolveDocumentTheme(pref);
  return {
    preference: pref,
    theme: doc,
    isDark: themeIsDark(pref, doc),
    toggle: () => {},
    setTheme: () => {},
  };
}

export function bootstrapTheme() {
  try {
    if (typeof window !== 'undefined') window.localStorage?.removeItem('colorTheme');
  } catch { /* ignore */ }
  applyThemePreference(readPref());
}
