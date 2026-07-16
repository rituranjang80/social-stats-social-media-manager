import { X } from 'lucide-react';
import { PLATFORMS } from './constants';

export function ComposerPreviewCard({
  platform, content, mediaAssets, mediaType, user, firstComment = '',
}) {
  const meta = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];
  const handle = user?.first_name || user?.email?.split('@')[0] || 'You';

  return (
    <article
      className={`composer-preview-card composer-preview-card--${platform}`}
      aria-label={`${meta.label} preview`}
    >
      <div className="composer-preview-card__header">
        <div className="composer-preview-card__avatar" aria-hidden="true">
          {handle[0].toUpperCase()}
        </div>
        <div>
          <div className="composer-preview-card__name">{handle}</div>
          <div className="composer-preview-card__meta">{meta.label} · just now</div>
        </div>
      </div>

      {platform !== 'instagram' && content && (
        <div className="composer-preview-card__text">{content}</div>
      )}

      {mediaAssets.length > 0 && mediaType !== 'text' && (
        <PreviewMedia assets={mediaAssets} mediaType={mediaType} platform={platform} />
      )}

      {platform === 'instagram' && content && (
        <div className="composer-preview-card__ig-caption">
          <strong>{handle}</strong>
          {' '}
          {content}
        </div>
      )}

      <div className="composer-preview-card__engage">
        <span>♡ Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>

      {firstComment.trim() && (
        <div className="composer-preview-card__first-comment">
          <span className="composer-preview-card__first-comment-label">First comment</span>
          <p>{firstComment}</p>
        </div>
      )}
    </article>
  );
}

function isVideoAsset(a) {
  return (a?.mime_type || '').startsWith('video/');
}

function seekFirstFrame(e) {
  try {
    const el = e.currentTarget;
    if (el.currentTime < 0.05) el.currentTime = 0.1;
  } catch {
    /* ignore */
  }
}

/** Renders image or video for platform live preview (FB / IG / YT / LI / …). */
function PreviewAssetVisual({ asset, className = '' }) {
  if (!asset) return null;
  const thumb = asset.thumbnail_url || '';
  const fileUrl = asset.file_url || '';

  if (isVideoAsset(asset) && fileUrl) {
    return (
      <video
        className={`composer-media-stage__video ${className}`.trim()}
        src={fileUrl}
        poster={thumb || undefined}
        muted
        playsInline
        preload="metadata"
        controls={false}
        onLoadedData={seekFirstFrame}
      />
    );
  }

  if (thumb || fileUrl) {
    return (
      <img
        className={className || undefined}
        src={thumb || fileUrl}
        alt={asset.alt_text || ''}
      />
    );
  }

  return null;
}

function PreviewMedia({ assets, mediaType, platform }) {
  const isSquare = platform === 'instagram';
  const primary = assets[0];
  const treatAsVideo = mediaType === 'video'
    || mediaType === 'reel'
    || isVideoAsset(primary);

  if (treatAsVideo) {
    const a = primary;
    const ratioClass = platform === 'instagram' && (mediaType === 'reel' || isVideoAsset(a))
      ? 'composer-media-stage--reel'
      : 'composer-media-stage--widescreen';
    return (
      <div className={`composer-media-stage ${ratioClass}`}>
        <PreviewAssetVisual asset={a} />
        <div className="composer-media-stage__play" aria-hidden="true">▶</div>
      </div>
    );
  }

  if (mediaType === 'carousel' && assets.length > 1) {
    return (
      <div className="composer-media-stage__carousel">
        {assets.map((a) => (
          <div
            key={a.id}
            className={`composer-media-stage__slide ${isSquare ? 'composer-media-stage__slide--square' : 'composer-media-stage__slide--wide'}`}
          >
            <PreviewAssetVisual asset={a} />
            {isVideoAsset(a) ? (
              <div className="composer-media-stage__play composer-media-stage__play--sm" aria-hidden="true">▶</div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const a = assets[0];
  return (
    <div
      className={`composer-media-stage ${isSquare ? 'composer-media-stage--square' : 'composer-media-stage--photo'}`}
    >
      <PreviewAssetVisual asset={a} />
    </div>
  );
}

export function ComposerPreflight({ result, onClose }) {
  return (
    <div className="t-panel composer-preflight">
      <div className="t-panel__body">
        <div className="composer-preflight__row">
          <strong className="composer-preflight__title">
            {result.ok ? 'Preflight passed' : 'Preflight found issues'}
          </strong>
          <button
            type="button"
            className="composer-preflight__dismiss"
            onClick={onClose}
            aria-label="Dismiss preflight"
          >
            <X size={14} />
          </button>
        </div>
        <div className="composer-preflight__list">
          {Object.entries(result.platforms || {}).map(([pid, status]) => {
            const p = PLATFORMS.find((x) => x.id === pid);
            return (
              <div
                key={pid}
                className={`composer-preflight__item composer-preflight__item--${pid} ${status.ok ? 'composer-preflight__item--ok' : 'composer-preflight__item--bad'}`}
              >
                <strong className="composer-preflight__platform">{p?.label || pid}</strong>
                {(status.errors || []).length > 0 && (
                  <ul className="composer-preflight__ul composer-preflight__ul--errors">
                    {status.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                )}
                {(status.warnings || []).length > 0 && (
                  <ul className="composer-preflight__ul composer-preflight__ul--warnings">
                    {status.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
