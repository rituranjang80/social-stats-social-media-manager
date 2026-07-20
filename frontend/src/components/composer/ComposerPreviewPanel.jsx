/* ============================================================================
 * Live preview drawer / side panel (Brightbean right rail).
 * Desktop: collapsible via right-edge toggle (mirrors left CollapsibleRail).
 * Mobile: slide-over drawer (unchanged).
 * ========================================================================== */
import { useEffect, useId, useRef } from 'react';
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
  const tabsId = useId();
  const tabsRef = useRef(null);
  const tabs = platforms?.length ? platforms : [];
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

  function handleTabKeyDown(event) {
    const currentIndex = tabs.indexOf(activePreview);
    if (currentIndex < 0) return;
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    onSelectPreview(tabs[nextIndex]);
    requestAnimationFrame(() => {
      tabsRef.current?.querySelector(`[data-platform="${tabs[nextIndex]}"]`)?.focus();
    });
  }

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

        {tabs.length > 0 ? (
          <div
            ref={tabsRef}
            className="composer__preview-tabs"
            role="tablist"
            aria-label="Preview platform"
            onKeyDown={handleTabKeyDown}
          >
            {tabs.map((pid) => {
              const platform = PLATFORMS.find((item) => item.id === pid);
              const active = pid === activePreview;
              return (
                <button
                  key={pid}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`${tabsId}-${pid}-panel`}
                  id={`${tabsId}-${pid}-tab`}
                  tabIndex={active ? 0 : -1}
                  data-platform={pid}
                  className={`composer__preview-tab composer__preview-tab--${pid} ${active ? 'is-active' : ''}`}
                  onClick={() => onSelectPreview(pid)}
                >
                  {platform?.label || pid}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="composer__preview-body">
          {tabs.length === 0 ? (
            <div className="composer-preview-empty" role="status">
              <div className="composer-preview-empty__icon" aria-hidden="true">
                <Eye size={28} strokeWidth={1.5} />
              </div>
              <p className="composer-preview-empty__title">Select a channel</p>
              <p className="composer-preview-empty__hint">
                Choose a connected channel to create its live preview.
              </p>
            </div>
          ) : null}
          {tabs.map((pid) => {
            const active = pid === activePreview;
            return (
              <div
                key={pid}
                id={`${tabsId}-${pid}-panel`}
                role="tabpanel"
                aria-labelledby={`${tabsId}-${pid}-tab`}
                tabIndex={active ? 0 : -1}
                hidden={!active}
              >
                {active && (!hasPreview ? (
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
                    platform={pid}
                    content={content}
                    mediaAssets={mediaAssets}
                    mediaType={mediaType}
                    user={user}
                    firstComment={firstComment}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
