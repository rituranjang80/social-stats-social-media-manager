/* ============================================================================
 *  Branding — read only from REACT_APP_* environment variables (.env).
 *  Defaults match the stock Social Stats identity when vars are unset.
 * ========================================================================== */

const trim = (v) => (v == null ? '' : String(v).trim());

const DEFAULT_NAME = 'Social Stats111';
const DEFAULT_TITLE = 'Social Stats111 — The marketing OS for modern teams';
const DEFAULT_DESCRIPTION =
  'Social Stats — the marketing OS for modern teams. Manage analytics, content, conversations, and ads across Facebook, Instagram, YouTube, LinkedIn, and Google Business in one place.';
const DEFAULT_PRIMARY = '#00CCF5';
const PUBLIC ='';// process.env.PUBLIC_URL || '';

function publicUrl(path) {
  const p = trim(path);
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = PUBLIC.replace(/\/$/, '');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

export const brand = Object.freeze({
  /** Display name (wordmark, aria-labels) */
  name: trim(process.env.REACT_APP_BRAND_NAME) || DEFAULT_NAME,
  /** Browser tab title */
  documentTitle: trim(process.env.REACT_APP_DOCUMENT_TITLE) || DEFAULT_TITLE,
  /** meta description + PWA hints */
  description: trim(process.env.REACT_APP_BRAND_DESCRIPTION) || DEFAULT_DESCRIPTION,
  /** Short PWA / manifest-style name */
  shortName: trim(process.env.REACT_APP_BRAND_SHORT_NAME) || trim(process.env.REACT_APP_BRAND_NAME) || DEFAULT_NAME,
  /** Header mark: empty = built-in SVG; set URL for image (png/svg/webp) */
  logoUrl: publicUrl(process.env.REACT_APP_BRAND_LOGO_URL),
  faviconUrl: publicUrl(trim(process.env.REACT_APP_FAVICON_URL) || '/icons/icon-192.png'),
  appleTouchIconUrl: publicUrl(trim(process.env.REACT_APP_APPLE_TOUCH_ICON_URL) || '/apple-touch-icon.png'),
  primaryColor: trim(process.env.REACT_APP_BRAND_PRIMARY_COLOR) || DEFAULT_PRIMARY,
});

export default brand;
