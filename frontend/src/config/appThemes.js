/**
 * Full-application themes — each sets `<html data-theme="…">` (same as Light/Dark).
 * Base: light, dark, system. Extended: seven complete palettes below.
 */

import {
  Sun, Moon, Monitor, Droplets, Sparkles, Leaf, Flame, Heart, Gem, Eclipse,
} from 'lucide-react';

export const BASE_THEME_IDS = ['light', 'dark', 'system'];

export const EXTENDED_THEME_IDS = [
  'ocean',
  'violet',
  'emerald',
  'sunset',
  'rose',
  'indigo',
  'midnight',
];

export const ALL_THEME_IDS = new Set([...BASE_THEME_IDS, ...EXTENDED_THEME_IDS]);

/** @type {ReadonlyArray<{ id: string; label: string; icon: import('react').ComponentType; isDark?: boolean }>} */
export const APPEARANCE_THEMES = Object.freeze([
  { id: 'light',    label: 'Light',    icon: Sun },
  { id: 'dark',     label: 'Dark',     icon: Moon, isDark: true },
  { id: 'system',   label: 'System',   icon: Monitor },
  { id: 'ocean',    label: 'Ocean',    icon: Droplets },
  { id: 'violet',   label: 'Violet',   icon: Sparkles },
  { id: 'emerald',  label: 'Emerald',  icon: Leaf },
  { id: 'sunset',   label: 'Sunset',   icon: Flame },
  { id: 'rose',     label: 'Rose',     icon: Heart },
  { id: 'indigo',   label: 'Indigo',   icon: Gem, isDark: true },
  { id: 'midnight', label: 'Midnight', icon: Eclipse, isDark: true },
]);

export function isExtendedTheme(id) {
  return EXTENDED_THEME_IDS.includes(id);
}

export function themeIsDark(preference, resolvedDataTheme) {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  if (preference === 'system') {
    return resolvedDataTheme === 'dark';
  }
  const meta = APPEARANCE_THEMES.find((t) => t.id === preference);
  return !!meta?.isDark;
}
