/* ============================================================================
 * Live preview drawer / side panel (Brightbean right rail).
 * Desktop: collapsible via right-edge toggle (mirrors left CollapsibleRail).
 * Mobile: slide-over drawer (unchanged).
 * ========================================================================== */
import { useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { PLATFORMS } from './constants';
import { ComposerPreviewCard } from './ComposerPreview';
import TEdgeToggle from '../t/TEdgeToggle';

export const COMPOSER_PREVIEW_STORAGE_KEY = 'socialstats.composer-preview-expanded';

export function readComposerPreviewExpanded() {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(COMPOSER_PREVIEW_STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export default function ComposerPreviewPanel({
  open,
  onClose,
  desktopExpanded = true,
  onDesktopExpandedChange,
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

  useEffect(() => {
    try {
      localStorage.setItem(COMPOSER_PREVIEW_STORAGE_KEY, desktopExpanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [desktopExpanded]);

  const toggleDesktop = () => {
    onDesktopExpandedChange?.(!desktopExpanded);
  };

  return (
    <div
      className={[
        'composer__preview-rail',
        desktopExpanded ? 'is-expanded' : 'is-collapsed',
      ].join(' ')}
    >
      <TEdgeToggle
        side="right"
        expanded={desktopExpanded}
        onToggle={toggleDesktop}
        align="top"
        controlsId="composer-preview"
        className="composer__preview-edge-toggle"
        collapseLabel="Collapse preview panel"
        expandLabel="Expand preview panel"
      />

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
        className={[
          'composer__preview',
          open ? 'is-open' : '',
          desktopExpanded ? 'is-desktop-expanded' : 'is-desktop-collapsed',
        ].filter(Boolean).join(' ')}
        aria-label="Live preview"
        aria-hidden={!desktopExpanded && !open}
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
    </div>
  );
}
