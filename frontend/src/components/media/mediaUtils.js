/* ============================================================================
 * Shared media-library helpers.
 * ========================================================================== */

/** Gateway origin from REACT_APP_API_URL (e.g. http://localhost:8000). */
export function mediaPublicOrigin() {
  const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');
  return (process.env.REACT_APP_PUBLIC_ORIGIN || apiBase.replace(/\/api$/i, '') || apiBase).replace(/\/+$/, '');
}

/** Fix http://localhost/media/... (implicit port 80) → http://localhost:8000/media/... */
function fixLocalhostPort(absoluteUrl) {
  try {
    const u = new URL(absoluteUrl);
    const gateway = new URL(`${mediaPublicOrigin()}/`);
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') return absoluteUrl;
    const needsPort = !u.port || u.port === '80';
    if (!needsPort) return absoluteUrl;
    u.port = gateway.port || '8000';
    return u.href;
  } catch {
    return absoluteUrl;
  }
}

/** Turn API `/media/...` paths into absolute URLs the browser can load. */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  const origin = mediaPublicOrigin();

  const toAbsolute = (path) => {
    if (path.startsWith('/')) return `${origin}${path}`;
    return `${origin}/${path.replace(/^\/+/, '')}`;
  };

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      if (u.hostname === 'backend' || u.hostname === 'gateway') {
        return fixLocalhostPort(toAbsolute(u.pathname + u.search));
      }
      return fixLocalhostPort(trimmed);
    } catch {
      return fixLocalhostPort(trimmed);
    }
  }
  return fixLocalhostPort(toAbsolute(trimmed));
}

export function isVideoAsset(asset) {
  return (asset?.mime_type || '').startsWith('video/');
}

export function isImageAsset(asset) {
  return (asset?.mime_type || '').startsWith('image/');
}

export function assetFilename(asset) {
  if (asset?.filename) return asset.filename;
  const url = asset?.file_url || '';
  try {
    const path = decodeURIComponent(url.split('?')[0] || '');
    const base = path.split('/').pop();
    return base || '';
  } catch {
    return '';
  }
}

export function fmtBytes(n) {
  if (!n) return '—';
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Normalize API asset for composer state (stable shape). */
export function normalizeMediaAsset(asset) {
  if (!asset) return null;
  return {
    id: asset.id,
    uuid: asset.uuid ?? String(asset.id),
    client: asset.client,
    mime_type: asset.mime_type || '',
    file_size: asset.file_size || 0,
    width: asset.width || 0,
    height: asset.height || 0,
    duration_seconds: asset.duration_seconds || 0,
    alt_text: asset.alt_text || '',
    tags: asset.tags || [],
    folder: asset.folder || '',
    file_url: resolveMediaUrl(asset.file_url || ''),
    thumbnail_url: resolveMediaUrl(asset.thumbnail_url || ''),
    filename: asset.filename || assetFilename(asset),
    created_at: asset.created_at,
  };
}
