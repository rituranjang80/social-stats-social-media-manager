/* ============================================================================
 * Caption card — textarea, inline media dropzone/thumbs, footer meta.
 * ========================================================================== */
import { Image as ImageIcon } from 'lucide-react';
import AIWriteButton from '../ai/AIWriteButton';
import { TCard, TCharBar, TDropzone, TTextArea } from '../t';
import { ComposerMediaThumbs } from './ComposerPlatformPills';

export default function ComposerCaptionEditor({
  content,
  onContentChange,
  mediaAssets,
  onDropFiles,
  onRemoveAsset,
  onReplaceAsset,
  clientId,
  platform,
  onInsertAi,
  charUsed,
  charMax,
  charLimits = [],
  uploading = false,
  onOpenMediaLibrary,
  gridSpan = 12,
}) {
  const over = charMax != null && charUsed > charMax;

  return (
    <TCard
      label="Caption"
      gridSpan={gridSpan}
      className="composer__animate composer__animate--d2"
      meta={(
        <AIWriteButton
          clientId={clientId}
          platform={platform || 'instagram'}
          onInsert={onInsertAi}
          size="sm"
          align="right"
        />
      )}
    >
      <div className="composer__caption">
        <div className="composer__editor-toolbar" aria-label="Caption tools">
          <span className="composer__editor-mode">Plain text</span>
          <span className="composer__editor-help">
            Add hashtags directly or use AI assist below
          </span>
        </div>
        <TTextArea
          id="composer-caption"
          rows={7}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="What would you like to share?"
          aria-label="Post caption"
          textareaClassName="composer__textarea"
        />

        <div className="composer__media-row">
          <TDropzone
            onFiles={onDropFiles}
            className="composer-dropzone"
            label="Add images or videos"
            uploading={uploading}
          >
            <ImageIcon size={22} strokeWidth={1.5} className="composer-dropzone__icon" aria-hidden="true" />
            <span className="composer-dropzone__text">
              Drag &amp; drop or
              {' '}
              <span className="composer-dropzone__accent">select files</span>
            </span>
          </TDropzone>
          <ComposerMediaThumbs
            assets={mediaAssets}
            onRemove={onRemoveAsset}
            onReplace={onReplaceAsset}
          />
        </div>

        <div className="composer__caption-meta">
          {onOpenMediaLibrary ? (
            <button
              type="button"
              className="composer__media-library-link"
              onClick={onOpenMediaLibrary}
              aria-label="Open Media Library"
            >
              Media Library
            </button>
          ) : (
            <span />
          )}
          <span
            className={`composer__char-count${over ? ' is-over' : ''}`}
            aria-live="polite"
          >
            {charMax != null ? `${charUsed} / ${charMax}` : charUsed}
          </span>
        </div>
        {charMax != null || charLimits.length > 0 ? (
          <TCharBar
            used={charUsed}
            max={charMax || 1}
            items={charLimits}
          />
        ) : null}
      </div>
    </TCard>
  );
}
