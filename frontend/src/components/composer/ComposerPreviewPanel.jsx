/* ============================================================================
 * Live preview drawer / side panel (Brightbean right rail).
 * ========================================================================== */
import { Eye, X } from 'lucide-react';
import { PLATFORMS } from './constants';
import { ComposerPreviewCard } from './ComposerPreview';

export default function ComposerPreviewPanel({
  open,
  onClose,
  platforms,
  activePreview,
  onSelectPreview,
  content,
  mediaAssets,
  mediaType,
  user,
  firstComment,
}) {
  const tabs = platforms?.length ? platforms : ['facebook'];
  const hasPreview = Boolean(content?.trim()) || (mediaAssets?.length > 0);

  return (
    <>
      {open && (
        <button
          type="button"
          className="composer__preview-backdrop"
          aria-label="Close preview"
          onClick={onClose}
        />
      )}

      <aside
        id="composer-preview"
        className={`composer__preview ${open ? 'is-open' : ''}`}
        aria-label="Live preview"
      >
        <div className="composer__preview-header">
          <strong className="composer__preview-heading">Preview</strong>
          <div className="composer__preview-header-meta">
            {platforms?.length > 0 && (
              <span className="composer__preview-platforms">
                {platforms.length}
                {' '}
                {platforms.length === 1 ? 'platform' : 'platforms'}
              </span>
            )}
            <button
              type="button"
              className="composer__preview-close"
              onClick={onClose}
              aria-label="Close preview panel"
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="composer__preview-tabs" role="tablist" aria-label="Preview platform">
          {tabs.map((pid) => {
            const p = PLATFORMS.find((x) => x.id === pid) || PLATFORMS[0];
            const active = pid === activePreview;
            return (
              <button
                key={pid}
                type="button"
                role="tab"
                aria-selected={active}
                className={`composer__preview-tab composer__preview-tab--${pid} ${active ? 'is-active' : ''}`}
                onClick={() => onSelectPreview(pid)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="composer__preview-body">
          {!hasPreview ? (
            <div className="composer-preview-empty">
              <div className="composer-preview-empty__icon" aria-hidden="true">
                <Eye size={28} strokeWidth={1.5} />
              </div>
              <p className="composer-preview-empty__title">No preview yet</p>
              <p className="composer-preview-empty__hint">
                Select a platform and start writing to see how your post will look
              </p>
            </div>
          ) : (
            <ComposerPreviewCard
              platform={activePreview}
              content={content}
              mediaAssets={mediaAssets}
              mediaType={mediaType}
              user={user}
              firstComment={firstComment}
            />
          )}
        </div>
      </aside>
    </>
  );
}
