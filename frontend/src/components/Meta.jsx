import { useEffect } from 'react';
import {
  BRAND_NAME,
  BRAND_DESCRIPTION,
  DOCUMENT_TITLE,
  pageTitleWithBrand,
} from '../config/branding';

/**
 * Meta — imperative document head manager. No extra dependency.
 *
 * Renders nothing. On mount and whenever its props change, updates:
 *   - <title>
 *   - <meta name="description">
 *   - canonical link
 *   - Open Graph tags (og:title, og:description, og:image, og:url, og:type)
 *   - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
 *
 * Stack-aware: when the next page mounts a new <Meta>, it overwrites these
 * tags. Untouched tags (favicon, theme-color etc.) stay where they are.
 *
 * Props:
 *   title:       page-specific title (gets " · {BRAND_NAME}" suffix unless `noSuffix`)
 *   description: meta description / og:description / twitter:description
 *   image:       og:image / twitter:image (absolute URL)
 *   url:         canonical / og:url (defaults to current location.href)
 *   type:        og:type (default 'website'; use 'article' for blog posts)
 *   noSuffix:    bool — drop the site-name suffix (use for the home page)
 */
const DEFAULT_IMAGE = '/og-image.png';

export default function Meta({
  title,
  description = BRAND_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noSuffix = false,
}) {
  useEffect(() => {
    const fullTitle = title
      ? pageTitleWithBrand(title, { noSuffix })
      : DOCUMENT_TITLE;

    document.title = fullTitle;
    setMetaName('description', description);

    const canonical = url || (typeof window !== 'undefined' ? window.location.href : '');
    setLink('canonical', canonical);

    setMetaProp('og:title', fullTitle);
    setMetaProp('og:description', description);
    setMetaProp('og:type', type);
    setMetaProp('og:url', canonical);
    setMetaProp('og:image', absUrl(image));
    setMetaProp('og:site_name', BRAND_NAME);

    setMetaName('twitter:card', 'summary_large_image');
    setMetaName('twitter:title', fullTitle);
    setMetaName('twitter:description', description);
    setMetaName('twitter:image', absUrl(image));
  }, [title, description, image, url, type, noSuffix]);

  return null;
}

function absUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

function setMetaName(name, content) {
  setMetaTag('name', name, content);
}
function setMetaProp(prop, content) {
  setMetaTag('property', prop, content);
}
function setMetaTag(attr, key, content) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content || '');
}
function setLink(rel, href) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href || '');
}
