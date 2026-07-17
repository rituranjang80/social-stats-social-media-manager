/**
 * Capture the current video frame to a JPEG blob + object URL.
 * Returns { blob, dataUrl, width, height } or throws.
 */
export async function captureVideoFrame(videoEl, { quality = 0.92 } = {}) {
  if (!videoEl || videoEl.readyState < 2) {
    throw new Error('Video is not ready — wait for it to load');
  }
  const w = videoEl.videoWidth;
  const h = videoEl.videoHeight;
  if (!w || !h) throw new Error('Could not read video dimensions');

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  try {
    ctx.drawImage(videoEl, 0, 0, w, h);
  } catch (err) {
    throw new Error(
      'Could not capture frame (cross-origin video). Use server extract or upload a thumbnail.',
    );
  }

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Frame capture failed'))),
      'image/jpeg',
      quality,
    );
  });

  return { blob, dataUrl, width: w, height: h };
}

export function frameFilename(seconds) {
  const s = Math.floor(Number(seconds) || 0);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `video-frame-${h}-${m}-${sec}.jpg`;
}
