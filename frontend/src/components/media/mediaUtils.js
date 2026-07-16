/* ============================================================================
 * Shared media-library helpers.
 * ========================================================================== */

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
    file_url: asset.file_url || '',
    thumbnail_url: asset.thumbnail_url || '',
    filename: asset.filename || assetFilename(asset),
    created_at: asset.created_at,
  };
}
