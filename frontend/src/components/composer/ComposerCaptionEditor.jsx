/* ============================================================================
 * Caption card — textarea, inline media dropzone/thumbs, footer meta.
 * ========================================================================== */
import { Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import AIWriteButton from '../ai/AIWriteButton';
import { TDropzone } from '../t';
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
  mediaLibraryPath,
}) {
  const over = charMax != null && charUsed > charMax;

  return (
    <section className="composer__section composer__animate composer__animate--d2">
      <div className="composer__section-head">
        <label className="composer__section-label" htmlFor="composer-caption">
          Caption
        </label>
        <div className="composer__caption-tools">
          <AIWriteButton
            clientId={clientId}
            platform={platform || 'instagram'}
            onInsert={onInsertAi}
            size="sm"
            align="right"
          />
        </div>
      </div>

      <div className="composer__caption">
        <textarea
          id="composer-caption"
          className="composer__textarea"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="What would you like to share?"
          rows={7}
          aria-label="Post caption"
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
          {mediaLibraryPath ? (
            <Link to={mediaLibraryPath} className="composer__media-library-link">
              Media Library
            </Link>
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
    </section>
  );
}
