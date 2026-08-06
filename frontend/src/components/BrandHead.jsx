/* Applies document title, favicon, manifest, and meta tags from branding (.env). */
import { useEffect } from 'react';
import {
  brand,
  BRAND_PRIMARY_COLOR,
  installBrandingWebManifest,
} from '../config/branding';

function upsertLink(rel, href, extra = {}) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  Object.entries(extra).forEach(([k, v]) => {
    if (v != null) el.setAttribute(k, v);
  });
}

function upsertMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

export default function BrandHead() {
  useEffect(() => {
    document.title = brand.documentTitle;
    upsertMeta('description', brand.description);
    upsertMeta('apple-mobile-web-app-title', brand.shortName);
    upsertMeta('theme-color', BRAND_PRIMARY_COLOR);
    upsertLink('icon', brand.faviconUrl, { type: 'image/png' });
    upsertLink('apple-touch-icon', brand.appleTouchIconUrl);
    installBrandingWebManifest();
  }, []);

  return null;
}
