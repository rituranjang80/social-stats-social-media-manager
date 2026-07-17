import PropTypes from 'prop-types';

/**
 * Preview of a captured (or candidate) thumbnail frame.
 */
export default function ThumbnailPreview({
  src,
  emptyLabel = 'Capture a frame to preview',
  showSafeArea = false,
  zoom = 1,
}) {
  if (!src) {
    return (
      <div className="thumb-dialog__preview thumb-dialog__preview--empty" role="img" aria-label={emptyLabel}>
        <p>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`thumb-dialog__preview${showSafeArea ? ' has-safe-area' : ''}`}>
      <div
        className="thumb-dialog__preview-zoom"
        data-zoom={Math.round((zoom || 1) * 10)}
      >
        <img src={src} alt="Captured thumbnail preview" />
      </div>
      {showSafeArea ? (
        <div className="thumb-dialog__safe-area" aria-hidden title="16:9 safe area" />
      ) : null}
    </div>
  );
}

ThumbnailPreview.propTypes = {
  src: PropTypes.string,
  emptyLabel: PropTypes.string,
  showSafeArea: PropTypes.bool,
  zoom: PropTypes.number,
};
