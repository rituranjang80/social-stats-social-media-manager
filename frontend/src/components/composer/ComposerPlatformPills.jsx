import { X, Video } from 'lucide-react';
import { TPill } from '../t';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { PLATFORMS } from './constants';

export function ComposerPlatformPills({ platforms = PLATFORMS, selected, onToggle }) {
  return (
    <div className="composer__platforms" role="group" aria-label="Publish to platforms">
      {platforms.map((p) => {
        const on = selected.includes(p.id);
        return (
          <TPill
            key={p.id}
            selected={on}
            showCheck
            color={p.color}
            onClick={() => onToggle(p.id)}
            className={`t-pill--${p.id}`}
          >
            <span className="t-pill__brand-icon" aria-hidden="true">
              <SocialPlatformIcon platform={p.id} size={16} />
            </span>
            {p.label}
          </TPill>
        );
      })}
    </div>
  );
}

export function ComposerMediaThumbs({ assets, onRemove }) {
  if (!assets?.length) return null;
  return (
    <>
      {assets.map((a, idx) => (
        <div key={a.id} className="t-media-thumb">
          {a.thumbnail_url || (a.mime_type || '').startsWith('image/') ? (
            <img src={a.thumbnail_url || a.file_url} alt={a.alt_text || ''} />
          ) : (
            <div className="t-media-thumb__file">
              <Video size={28} aria-hidden="true" />
            </div>
          )}
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
