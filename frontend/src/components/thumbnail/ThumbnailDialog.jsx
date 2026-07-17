import {
  useCallback, useEffect, useId, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Camera, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import ThumbnailTimeline, { formatTimecode } from './ThumbnailTimeline';
import ThumbnailPreview from './ThumbnailPreview';
import { captureVideoFrame, frameFilename } from './FrameCapture';
import {
  loadImageDimensions,
  validateThumbnailAspect,
  validateThumbnailFile,
} from '../youtube/validation';
import { composerAPI, videoAPI } from '../../services/api';
import { normalizeMediaAsset } from '../media';

/**
 * Modal thumbnail creator — reuses Video Studio extract API + client frame capture.
 * Does not upload until the user confirms "Use Thumbnail".
 */
export default function ThumbnailDialog({
  open,
  onClose,
  videoAsset,
  clientId,
  onUseThumbnail,
}) {
  const titleId = useId();
  const videoRef = useRef(null);
  const fileRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [capturedUrl, setCapturedUrl] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [safeArea, setSafeArea] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const src = videoAsset?.file_url || videoAsset?.url || '';

  useEffect(() => {
    if (!open) {
      setPlaying(false);
      setCapturedUrl('');
      setCapturedBlob(null);
      setError('');
      setCropZoom(1);
      setCurrentTime(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(0, (v.currentTime || 0) - 1 / 25);
        v.currentTime = next;
        setCurrentTime(next);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const max = v.duration || 0;
        const next = Math.min(max, (v.currentTime || 0) + 1 / 25);
        v.currentTime = next;
        setCurrentTime(next);
      }
      if (e.key === ' ') {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'button') return;
        e.preventDefault();
        if (v.paused) {
          v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        } else {
          v.pause();
          setPlaying(false);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const seekTo = useCallback((t) => {
    const v = videoRef.current;
    if (!v) return;
    const next = Math.max(0, Math.min(duration || v.duration || 0, t));
    v.currentTime = next;
    setCurrentTime(next);
  }, [duration]);

  function seekBy(delta) {
    seekTo(currentTime + delta);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  async function onCapture() {
    setError('');
    try {
      const v = videoRef.current;
      const result = await captureVideoFrame(v);
      const aspect = validateThumbnailAspect(result.width, result.height);
      if (!aspect.ok) {
        // Still allow capture — YouTube accepts various sizes; warn softly
        toast(aspect.error, { icon: '⚠️' });
      }
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      const obj = URL.createObjectURL(result.blob);
      setCapturedBlob(result.blob);
      setCapturedUrl(obj);
    } catch (e) {
      setError(e.message || 'Capture failed');
      // Fallback: server-side extract (Video Studio path)
      if (videoAsset?.id != null) {
        setBusy(true);
        try {
          const res = await videoAPI.extractThumbnail({
            asset_id: videoAsset.id,
            time_seconds: currentTime,
          });
          const asset = normalizeMediaAsset(res.data);
          const url = asset?.file_url || asset?.url || asset?.thumbnail_url;
          setCapturedUrl(url || '');
          setCapturedBlob(null);
          toast.success('Frame extracted on server');
        } catch (err) {
          toast.error(err.response?.data?.error || 'Server extract failed');
        } finally {
          setBusy(false);
        }
      }
    }
  }

  function onRetake() {
    if (capturedUrl && capturedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl('');
    setCapturedBlob(null);
    setError('');
  }

  async function onFilePick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateThumbnailFile(file);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const dims = await loadImageDimensions(url);
      const aspect = validateThumbnailAspect(dims.width, dims.height);
      if (!aspect.ok) toast(aspect.error, { icon: '⚠️' });
    } catch {
      /* ignore */
    }
    if (capturedUrl && capturedUrl.startsWith('blob:')) URL.revokeObjectURL(capturedUrl);
    setCapturedBlob(file);
    setCapturedUrl(url);
  }

  async function onUse() {
    if (!capturedUrl && !capturedBlob) {
      toast.error('Capture or upload a thumbnail first');
      return;
    }
    setBusy(true);
    setError('');
    try {
      let asset;
      if (capturedBlob) {
        if (!clientId) throw new Error('Select a workspace first');
        const fd = new FormData();
        const name = capturedBlob.name || frameFilename(currentTime);
        fd.append('file', capturedBlob, name);
        const res = await composerAPI.media.upload(fd, { client_id: clientId });
        asset = normalizeMediaAsset(res.data);
      } else if (videoAsset?.id != null && !capturedBlob) {
        // Already a server asset URL from extractThumbnail
        const res = await videoAPI.extractThumbnail({
          asset_id: videoAsset.id,
          time_seconds: currentTime,
        });
        asset = normalizeMediaAsset(res.data);
      }
      if (!asset?.id) throw new Error('Could not save thumbnail');
      const url = asset.file_url || asset.url || asset.thumbnail_url || capturedUrl;
      onUseThumbnail({
        thumbnail_asset_id: asset.id,
        thumbnail_url: url,
        asset,
      });
      toast.success('Thumbnail ready');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Save failed');
      setError(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="thumb-dialog" role="presentation">
      <button type="button" className="thumb-dialog__backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="thumb-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="thumb-dialog__header">
          <div>
            <h2 id={titleId} className="thumb-dialog__title">Custom Thumbnail</h2>
            <p className="thumb-dialog__subtitle">
              Scrub to a frame, capture, then use it — nothing uploads until you confirm.
            </p>
          </div>
          <button type="button" className="thumb-dialog__close" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>

        <div className="thumb-dialog__body">
          <div className="thumb-dialog__player-col">
            {src ? (
              <div className="thumb-dialog__stage">
                <video
                  ref={videoRef}
                  className="thumb-dialog__video"
                  src={src}
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration || 0);
                    setCurrentTime(e.currentTarget.currentTime || 0);
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />
                {safeArea ? <div className="thumb-dialog__safe-area thumb-dialog__safe-area--player" aria-hidden /> : null}
              </div>
            ) : (
              <div className="thumb-dialog__stage thumb-dialog__stage--empty">
                Attach a video in the composer first.
              </div>
            )}

            <div className="thumb-dialog__controls" role="toolbar" aria-label="Playback">
              <button type="button" className="thumb-dialog__icon-btn" onClick={togglePlay} disabled={!src} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button type="button" className="thumb-dialog__icon-btn" onClick={() => seekBy(-1 / 25)} disabled={!src} aria-label="Previous frame">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="thumb-dialog__icon-btn" onClick={() => seekBy(1 / 25)} disabled={!src} aria-label="Next frame">
                <ChevronRight size={18} />
              </button>
              <span className="thumb-dialog__now">{formatTimecode(currentTime)}</span>
              <label className="thumb-dialog__safe-toggle">
                <input type="checkbox" checked={safeArea} onChange={(e) => setSafeArea(e.target.checked)} />
                16:9 overlay
              </label>
            </div>

            <ThumbnailTimeline
              currentTime={currentTime}
              duration={duration}
              onSeek={seekTo}
              disabled={!src}
            />
          </div>

          <div className="thumb-dialog__side">
            <ThumbnailPreview src={capturedUrl} showSafeArea={safeArea} zoom={cropZoom} />
            <div className="thumb-dialog__zoom-row">
              <button type="button" className="thumb-dialog__icon-btn" onClick={() => setCropZoom((z) => Math.max(1, z - 0.1))} aria-label="Zoom out">
                <ZoomOut size={16} />
              </button>
              <span>Zoom {Math.round(cropZoom * 100)}%</span>
              <button type="button" className="thumb-dialog__icon-btn" onClick={() => setCropZoom((z) => Math.min(3, z + 0.1))} aria-label="Zoom in">
                <ZoomIn size={16} />
              </button>
            </div>
            {error ? <p className="thumb-dialog__error" role="alert">{error}</p> : null}
          </div>
        </div>

        <footer className="thumb-dialog__footer">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="thumb-dialog__file"
            onChange={onFilePick}
          />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            Upload image
          </Button>
          <Button variant="secondary" size="sm" icon={Camera} onClick={onCapture} disabled={!src || busy} loading={busy}>
            Capture frame
          </Button>
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onRetake} disabled={!capturedUrl}>
            Retake
          </Button>
          <div className="thumb-dialog__footer-spacer" />
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onUse} disabled={!capturedUrl || busy} loading={busy}>
            Use Thumbnail
          </Button>
        </footer>
      </div>
    </div>
  );
}

ThumbnailDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  videoAsset: PropTypes.object,
  clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onUseThumbnail: PropTypes.func.isRequired,
};
