/* ============================================================================
 *  White-label branding — ONLY this module reads REACT_APP_BRAND_* from .env.
 * ========================================================================== */

const trim = (v) => (v == null ? '' : String(v).trim());

const PUBLIC = process.env.PUBLIC_URL || '';

/** @typedef {Readonly<{
 *  name: string;
 *  shortName: string;
 *  documentTitle: string;
 *  description: string;
 *  logoUrl: string;
 *  faviconUrl: string;
 *  appleTouchIconUrl: string;
 *  primaryColor: string;
 * }>} BrandConfig */

function publicUrl(path) {
  const p = trim(path);
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = PUBLIC.replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

function parseHex(hex) {
  const h = trim(hex).replace('#', '');
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return Number.isFinite(r) ? { r, g, b } : null;
  }
  return null;
}

function rgbToHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[c(r), c(g), c(b)].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

function primaryColorVariants(primaryHex) {
  const base = parseHex(primaryHex);
  if (!base) {
    return {
      primary: primaryHex,
      hover: primaryHex,
      active: primaryHex,
      soft: 'rgba(37, 99, 235, 0.10)',
      glow: 'rgba(37, 99, 235, 0.18)',
    };
  }
  const black = { r: 0, g: 0, b: 0 };
  const hover = mixRgb(base, black, 0.12);
  const active = mixRgb(base, black, 0.28);
  return {
    primary: rgbToHex(base),
    hover: rgbToHex(hover),
    active: rgbToHex(active),
    soft: `rgba(${base.r}, ${base.g}, ${base.b}, 0.10)`,
    glow: `rgba(${base.r}, ${base.g}, ${base.b}, 0.18)`,
  };
}

// ── Fallbacks (only here — neutral when .env is unset) ─────────────────────
const FB_NAME = 'Application';
const FB_SHORT = 'App';
const FB_TITLE = 'Application';
const FB_DESC =
  'Social media management and marketing platform for agencies and businesses.';
const FB_PRIMARY = '#2563eb';
const FB_FAVICON = '/icons/icon-192.png';
const FB_APPLE = '/apple-touch-icon.png';

export const BRAND_NAME =
  trim(process.env.REACT_APP_BRAND_NAME) || FB_NAME;
export const BRAND_SHORT_NAME =
  trim(process.env.REACT_APP_BRAND_SHORT_NAME) ||
  trim(process.env.REACT_APP_BRAND_NAME) ||
  FB_SHORT;
export const DOCUMENT_TITLE =
  trim(process.env.REACT_APP_DOCUMENT_TITLE) || FB_TITLE;
export const BRAND_DESCRIPTION =
  trim(process.env.REACT_APP_BRAND_DESCRIPTION) || FB_DESC;
export const BRAND_LOGO_URL = publicUrl(process.env.REACT_APP_BRAND_LOGO_URL);
export const FAVICON_URL = publicUrl(
  trim(process.env.REACT_APP_FAVICON_URL) || FB_FAVICON,
);
export const APPLE_TOUCH_ICON_URL = publicUrl(
  trim(process.env.REACT_APP_APPLE_TOUCH_ICON_URL) || FB_APPLE,
);
export const BRAND_PRIMARY_COLOR =
  trim(process.env.REACT_APP_BRAND_PRIMARY_COLOR) || FB_PRIMARY;

/** @type {BrandConfig} */
export const brand = Object.freeze({
  name: BRAND_NAME,
  shortName: BRAND_SHORT_NAME,
  documentTitle: DOCUMENT_TITLE,
  description: BRAND_DESCRIPTION,
  logoUrl: BRAND_LOGO_URL,
  faviconUrl: FAVICON_URL,
  appleTouchIconUrl: APPLE_TOUCH_ICON_URL,
  primaryColor: BRAND_PRIMARY_COLOR,
});

export function pageTitleWithBrand(pageTitle, { noSuffix = false } = {}) {
  if (!pageTitle) return DOCUMENT_TITLE;
  if (noSuffix) return pageTitle;
  return `${pageTitle} · ${BRAND_NAME}`;
}

export function titleWithBrandSuffix(segment) {
  return segment ? `${segment} — ${BRAND_NAME}` : DOCUMENT_TITLE;
}

export function brandNativeLabel() {
  return `${BRAND_NAME} Native`;
}

export function brandStudioTitle() {
  return `${BRAND_NAME} Studio`;
}

export function poweredByBrand() {
  return `Powered by ${BRAND_NAME}`;
}

export function brandThinkingLabel() {
  return `${BRAND_NAME} is thinking…`;
}

export function brandWritingLabel() {
  return `${BRAND_NAME} is writing…`;
}

export function brandResearchingHashtagsLabel() {
  return `${BRAND_NAME} is researching hashtags…`;
}

export function brandStudyingVoiceLabel() {
  return `${BRAND_NAME} is studying your voice…`;
}

export function welcomeToBrand(firstName) {
  const who = trim(firstName);
  return who ? `Welcome to ${BRAND_NAME}, ${who}!` : `Welcome to ${BRAND_NAME}!`;
}

export function openBrandAssistantLabel() {
  return `Open ${BRAND_NAME} (Cmd+J)`;
}

export function openBrandAssistantTitle() {
  return `${BRAND_NAME} (⌘J)`;
}

export function generatedByBrandLine(page, pages, dateStr) {
  return `Generated by ${BRAND_NAME} • Page ${page} of ${pages} • ${dateStr}`;
}

export function siteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

export function absoluteBrandLogoUrl() {
  if (!BRAND_LOGO_URL) return '';
  if (/^https?:\/\//i.test(BRAND_LOGO_URL)) return BRAND_LOGO_URL;
  const origin = siteOrigin();
  return origin ? new URL(BRAND_LOGO_URL, origin).toString() : BRAND_LOGO_URL;
}

export function applyBrandingCssVariables() {
  if (typeof document === 'undefined') return;
  const v = primaryColorVariants(BRAND_PRIMARY_COLOR);
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', v.primary);
  root.style.setProperty('--brand-primary-hover', v.hover);
  root.style.setProperty('--brand-primary-active', v.active);
  root.style.setProperty('--brand-primary-soft', v.soft);
  root.style.setProperty('--brand-primary-glow', v.glow);
  root.style.setProperty('--brand-cyan', v.primary);
  root.style.setProperty('--blue', v.hover);
}

let manifestObjectUrl = null;

export function installBrandingWebManifest() {
  if (typeof document === 'undefined') return;
  const manifest = {
    short_name: BRAND_SHORT_NAME,
    name: DOCUMENT_TITLE,
    description: BRAND_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: BRAND_PRIMARY_COLOR,
    background_color: '#fafbfc',
    scope: '/',
    icons: [
      {
        src: FAVICON_URL.startsWith('http') ? FAVICON_URL : FAVICON_URL || FB_FAVICON,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['business', 'productivity'],
    prefer_related_applications: false,
  };

  const json = JSON.stringify(manifest);
  if (manifestObjectUrl) URL.revokeObjectURL(manifestObjectUrl);
  manifestObjectUrl = URL.createObjectURL(
    new Blob([json], { type: 'application/json' }),
  );

  let link = document.querySelector('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  link.href = manifestObjectUrl;
}

export default brand;
