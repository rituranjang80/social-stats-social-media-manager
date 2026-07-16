/* ============================================================================
 * Caption card — textarea, inline media dropzone/thumbs, footer meta.
 * ========================================================================== */
import { Image as ImageIcon } from 'lucide-react';
import AIWriteButton from '../ai/AIWriteButton';
import { TCard, TDropzone, TTextArea } from '../t';
import { ComposerMediaThumbs } from './ComposerPlatformPills';

export default function ComposerCaptionEditor({
  content,
  onContentChange,
  mediaAssets,
  onDropFiles,
  onRemoveAsset,
  clientId,
  platform,
  onInsertAi,
  charUsed,
  charMax,
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
          <TDropzone onFiles={onDropFiles} className="composer-dropzone" label="Add media">
            <ImageIcon size={22} strokeWidth={1.5} className="composer-dropzone__icon" aria-hidden="true" />
            <span className="composer-dropzone__text">
              Drag &amp; drop or
              {' '}
              <span className="composer-dropzone__accent">select files</span>
            </span>
          </TDropzone>
          <ComposerMediaThumbs assets={mediaAssets} onRemove={onRemoveAsset} />
        </div>

        <div className="composer__caption-meta">
          {onOpenMediaLibrary ? (
            <button
              type="button"
              className="composer__media-library-link"
              onClick={onOpenMediaLibrary}
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
      </div>
    </TCard>
  );
}
