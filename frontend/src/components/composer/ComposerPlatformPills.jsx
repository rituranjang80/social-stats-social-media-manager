import { Check, X, Video } from 'lucide-react';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { PLATFORMS } from './constants';

export function ComposerPlatformPills({ platforms = PLATFORMS, selected, onToggle }) {
  return (
    <div className="composer__platforms" role="group" aria-label="Publish to platforms">
      {platforms.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            className={`composer-acct-pill ${on ? 'is-selected' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(p.id)}
          >
            <span className="composer-acct-pill__check" aria-hidden="true">
              {on ? <Check size={10} strokeWidth={3} /> : null}
            </span>
            <span
              className={`composer-acct-pill__icon composer-acct-pill__icon--${p.id}`}
              aria-hidden="true"
            >
              <SocialPlatformIcon platform={p.id} size={14} />
            </span>
            <span className="composer-acct-pill__label">{p.label}</span>
          </button>
        );
      })}
    </div>
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
