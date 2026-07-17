import { X, Video } from 'lucide-react';
import { ChannelSelector } from '../channels';

/**
 * Legacy composer platform pills — now Brightbean-style ChannelSelector.
 * Keeps the same selected/onToggle contract for targetPlatforms.
 */
export function ComposerPlatformPills({
  selected,
  onToggle,
  clientId = null,
  workspaceLabel = '',
  platforms,
}) {
  const platformIds = platforms?.length
    ? platforms.map((p) => p.id)
    : undefined;

  return (
    <ChannelSelector
      clientId={clientId}
      workspaceLabel={workspaceLabel}
      selected={selected}
      onToggle={onToggle}
      platformIds={platformIds}
    />
  );
}

function seekFirstFrame(e) {
  try {
    const el = e.currentTarget;
    if (el.currentTime < 0.05) el.currentTime = 0.1;
  } catch {
    /* ignore */
  }
}

/** Thumb preview for composer media row — images + video first frame. */
function MediaThumbPreview({ asset }) {
  const isVideo = (asset.mime_type || '').startsWith('video/');
  const thumb = asset.thumbnail_url || '';
  const fileUrl = asset.file_url || '';

  if (isVideo && fileUrl) {
    return (
      <video
        className="t-media-thumb__video"
        src={fileUrl}
        poster={thumb || undefined}
        muted
        playsInline
        preload="metadata"
        onLoadedData={seekFirstFrame}
      />
    );
  }

  if (thumb || (!isVideo && fileUrl)) {
    return (
      <img
        src={thumb || fileUrl}
        alt={asset.alt_text || ''}
      />
    );
  }

  return (
    <div className="t-media-thumb__file">
      <Video size={28} aria-hidden="true" />
    </div>
  );
}

export function ComposerMediaThumbs({ assets, onRemove }) {
  if (!assets?.length) return null;
  return (
    <>
      {assets.map((a, idx) => (
        <div key={a.id} className="t-media-thumb">
          <MediaThumbPreview asset={a} />
          {(a.mime_type || '').startsWith('video/') ? (
            <span className="t-media-thumb__video-badge" aria-hidden="true">▶</span>
          ) : null}
          <button
            type="button"
            className="t-media-thumb__remove"
            onClick={() => onRemove(idx)}
            aria-label="Remove media"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </>
  );
}
