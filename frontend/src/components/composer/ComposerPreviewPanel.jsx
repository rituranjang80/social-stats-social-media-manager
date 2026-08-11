/* ============================================================================
 * Live preview drawer / side panel (Brightbean right rail).
 * Each channel: name header (expand/collapse) → preview content below.
 * Double-click preview panel → floating draggable popup.
 * ========================================================================== */
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Eye, X } from 'lucide-react';
import { PLATFORMS } from './constants';
import { ComposerPreviewCard } from './ComposerPreview';
import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import TEdgeToggle from '../t/TEdgeToggle';
import ComposerPreviewFloatingPopup from './ComposerPreviewFloatingPopup';

export const COMPOSER_PREVIEW_STORAGE_KEY = 'socialstats.composer-preview-expanded';

export function readComposerPreviewExpanded() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(COMPOSER_PREVIEW_STORAGE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return false;
}

function defaultExpandedPlatform(platforms, activePreview) {
  if (!platforms?.length) return null;
  if (activePreview && platforms.includes(activePreview)) return activePreview;
  return platforms[0];
}

function isInteractivePreviewTarget(target) {
  return Boolean(
    target?.closest?.(
      'button, a, input, textarea, select, .composer-media-stage, video, .composer__preview-channel-trigger',
    ),
  );
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
  onPreviewVideoDoubleClick,
}) {
  const baseId = useId();
  const previewRef = useRef(null);
  const channels = platforms?.length ? platforms : [];
  const hasPreview = Boolean(content?.trim()) || (mediaAssets?.length > 0);
  const [floatOpen, setFloatOpen] = useState(false);

  const [expandedChannels, setExpandedChannels] = useState(() => {
    const pid = defaultExpandedPlatform(channels, activePreview);
    return pid ? new Set([pid]) : new Set();
  });

  useEffect(() => {
    try {
      localStorage.setItem(COMPOSER_PREVIEW_STORAGE_KEY, desktopExpanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [desktopExpanded]);

  useEffect(() => {
    const defaultPid = defaultExpandedPlatform(channels, activePreview);
    if (!defaultPid) {
      setExpandedChannels(new Set());
      return;
    }
    setExpandedChannels((prev) => {
      const kept = new Set([...prev].filter((pid) => channels.includes(pid)));
      if (kept.size === 0) kept.add(defaultPid);
      return kept;
    });
  }, [channels.join('|')]);

  useEffect(() => {
    if (activePreview && channels.includes(activePreview)) {
      setExpandedChannels((prev) => new Set(prev).add(activePreview));
    }
  }, [activePreview, channels.join('|')]);

  const toggleDesktop = () => {
    onDesktopExpandedChange?.(!desktopExpanded);
  };

  function openFloatingPreview() {
    setFloatOpen(true);
  }

  function handlePreviewDoubleClick(event) {
    if (isInteractivePreviewTarget(event.target)) return;
    event.preventDefault();
    openFloatingPreview();
  }

  function toggleChannel(pid) {
    onSelectPreview(pid);
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  function renderChannelBody(pid) {
    if (!hasPreview) {
      return (
        <div className="composer-preview-empty">
          <div className="composer-preview-empty__icon" aria-hidden="true">
            <Eye size={28} strokeWidth={1.5} />
          </div>
          <p className="composer-preview-empty__title">No preview yet</p>
          <p className="composer-preview-empty__hint">
            Start writing or attach media to see how your post will look on this channel.
          </p>
        </div>
      );
    }

    return (
      <ComposerPreviewCard
        platform={pid}
        content={content}
        mediaAssets={mediaAssets}
        mediaType={mediaType}
        user={user}
        firstComment={firstComment}
        onPreviewVideoDoubleClick={onPreviewVideoDoubleClick}
      />
    );
  }

  function renderAccordion(className = '') {
    return (
      <div className={['composer__preview-accordion', className].filter(Boolean).join(' ')}>
        {channels.length === 0 ? (
          <div className="composer-preview-empty" role="status">
            <div className="composer-preview-empty__icon" aria-hidden="true">
              <Eye size={28} strokeWidth={1.5} />
            </div>
            <p className="composer-preview-empty__title">Select a channel</p>
            <p className="composer-preview-empty__hint">
              Choose a connected channel to create its live preview.
            </p>
          </div>
        ) : (
          channels.map((pid) => {
            const platform = PLATFORMS.find((item) => item.id === pid);
            const label = platform?.label || pid;
            const isOpen = expandedChannels.has(pid);
            const bodyId = `${baseId}-${pid}-body`;
            const triggerId = `${baseId}-${pid}-trigger`;

            return (
              <section
                key={pid}
                className={[
                  'composer__preview-channel',
                  `composer__preview-channel--${pid}`,
                  isOpen ? 'is-open' : '',
                  pid === activePreview ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
              >
                <button
                  type="button"
                  id={triggerId}
                  className="composer__preview-channel-trigger"
                  aria-expanded={isOpen}
                  aria-controls={bodyId}
                  title={label}
                  onClick={() => toggleChannel(pid)}
                >
                  <ChevronDown
                    size={16}
                    strokeWidth={2.5}
                    className="composer__preview-channel-chevron"
                    aria-hidden="true"
                  />
                  <SocialPlatformIcon platform={pid} size={16} title="" />
                  <span className="composer__preview-channel-label">
                    {label}
                  </span>
                </button>

                {isOpen ? (
                  <div
                    id={bodyId}
                    className="composer__preview-channel-body"
                    role="region"
                    aria-labelledby={triggerId}
                  >
                    {renderChannelBody(pid)}
                  </div>
                ) : null}
              </section>
            );
          })
        )}
      </div>
    );
  }

  return (
    <>
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
          ref={previewRef}
          id="composer-preview"
          className={[
            'composer__preview',
            open ? 'is-open' : '',
            desktopExpanded ? 'is-desktop-expanded' : 'is-desktop-collapsed',
          ].filter(Boolean).join(' ')}
          aria-label="Live preview"
          aria-hidden={!open && !desktopExpanded}
          onDoubleClick={handlePreviewDoubleClick}
          title="Double-click to open floating preview"
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
              <span className="composer__preview-popout-hint">Double-click to pop out</span>
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

          {renderAccordion()}
        </aside>
      </div>

      <ComposerPreviewFloatingPopup
        open={floatOpen}
        onClose={() => setFloatOpen(false)}
      >
        {renderAccordion('composer__preview-accordion--float')}
      </ComposerPreviewFloatingPopup>
    </>
  );
}
