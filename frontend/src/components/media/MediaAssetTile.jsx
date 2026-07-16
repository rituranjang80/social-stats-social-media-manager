/* ============================================================================
 * Media asset tile — preview + select chrome (library + picker).
 * ========================================================================== */
import { Image as ImageIcon, Video, Folder, Play } from 'lucide-react';
import {
  isVideoAsset, fmtBytes, fmtDuration,
} from './mediaUtils';

export default function MediaAssetTile({
  asset,
  selected = false,
  disabled = false,
  onToggle,
  onActivate,
  onOpenVideo,
  mode = 'manage',
  hint,
}) {
  const isVideo = isVideoAsset(asset);

  return (
    <div
      role="listitem"
      tabIndex={disabled ? -1 : 0}
      className={[
        'media-asset-tile',
        selected ? 'is-selected' : '',
        disabled ? 'is-disabled' : '',
        mode === 'picker' ? 'media-asset-tile--picker' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => {
        if (disabled) return;
        onToggle?.(asset);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (disabled) return;
        if (mode === 'picker') {
          onActivate?.(asset);
          return;
        }
        if (isVideo) onOpenVideo?.(asset);
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isVideo && mode === 'manage') {
          e.preventDefault();
          onOpenVideo?.(asset);
          return;
        }
        if (e.key === 'Enter' && mode === 'picker') {
          e.preventDefault();
          onActivate?.(asset);
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle?.(asset);
        }
      }}
      title={hint || (isVideo
        ? (mode === 'picker' ? 'Click to select' : 'Click to select · Double-click to open in Video Studio')
        : 'Click to select')}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      aria-label={`${isVideo ? 'Video' : 'Media'} ${asset.alt_text || asset.filename || asset.id}`}
    >
      <div className="media-asset-tile__preview">
        <AssetPreview asset={asset} isVideo={isVideo} />
        {isVideo ? (
          <span className="media-asset-tile__play" aria-hidden="true">
            <Play size={28} fill="currentColor" strokeWidth={0} />
          </span>
        ) : null}
        {isVideo && asset.duration_seconds ? (
          <span className="media-asset-tile__duration">
            {fmtDuration(asset.duration_seconds)}
          </span>
        ) : null}
        {disabled ? (
          <span className="media-asset-tile__badge">Added</span>
        ) : null}
      </div>
      <div className="media-asset-tile__meta">
        <div className="media-asset-tile__row">
          <span>{(asset.mime_type || '').split('/')[1] || '—'}</span>
          <span>{fmtBytes(asset.file_size)}</span>
        </div>
        {asset.folder ? (
          <div className="media-asset-tile__folder">
            <Folder size={10} aria-hidden="true" />
            {' '}
            {asset.folder}
          </div>
        ) : null}
        {mode === 'manage' && isVideo ? (
          <div className="media-asset-tile__hint">Double-click → Video Studio</div>
        ) : null}
      </div>
    </div>
  );
}

function AssetPreview({ asset, isVideo }) {
  const thumb = asset.thumbnail_url || '';
  const fileUrl = asset.file_url || '';

  if (thumb) {
    return (
      <img
        className="media-asset-tile__img"
        src={thumb}
        alt={asset.alt_text || ''}
        loading="lazy"
      />
    );
  }

  if (!isVideo && fileUrl) {
    return (
      <img
        className="media-asset-tile__img"
        src={fileUrl}
        alt={asset.alt_text || ''}
        loading="lazy"
      />
    );
  }

  if (isVideo && fileUrl) {
    return (
      <video
        className="media-asset-tile__video"
        src={fileUrl}
        muted
        playsInline
        preload="metadata"
        onLoadedData={(e) => {
          try {
            const el = e.currentTarget;
            if (el.currentTime < 0.05) el.currentTime = 0.1;
          } catch {
            /* ignore seek errors */
          }
        }}
      />
    );
  }

  return isVideo
    ? <Video size={32} className="media-asset-tile__fallback" aria-hidden="true" />
    : <ImageIcon size={32} className="media-asset-tile__fallback" aria-hidden="true" />;
}
