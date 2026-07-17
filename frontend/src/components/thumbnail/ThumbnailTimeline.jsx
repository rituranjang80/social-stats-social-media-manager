import PropTypes from 'prop-types';

export function formatTimecode(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms)}`;
  return `${pad(m)}:${pad(sec)}.${pad(ms)}`;
}

/**
 * Seek / scrub timeline for thumbnail frame picking.
 */
export default function ThumbnailTimeline({
  currentTime,
  duration,
  onSeek,
  disabled,
}) {
  const max = Math.max(0.01, duration || 0);
  return (
    <div className="thumb-dialog__timeline">
      <input
        type="range"
        className="thumb-dialog__scrubber"
        min={0}
        max={max}
        step={0.04}
        value={Math.min(currentTime, max)}
        disabled={disabled || !duration}
        onChange={(e) => onSeek(parseFloat(e.target.value))}
        aria-label="Video timeline"
      />
      <div className="thumb-dialog__timecode" aria-live="polite">
        <span>{formatTimecode(currentTime)}</span>
        <span className="thumb-dialog__timecode-sep">/</span>
        <span>{formatTimecode(duration)}</span>
      </div>
    </div>
  );
}

ThumbnailTimeline.propTypes = {
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  onSeek: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
