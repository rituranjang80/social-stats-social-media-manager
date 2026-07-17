import {
  YT_DESCRIPTION_MAX,
  YT_TAGS_MAX_CHARS,
  YT_TAGS_MAX_COUNT,
  YT_THUMB_ACCEPT,
  YT_THUMB_MAX_BYTES,
  YT_THUMB_MAX_RATIO,
  YT_THUMB_MIN_RATIO,
  YT_TITLE_MAX,
} from './constants';

/**
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export function validateYoutubeSettings(settings, { forPublish = false } = {}) {
  const errors = {};
  const s = settings || {};

  const title = (s.title_override || '').trim();
  if (title.length > YT_TITLE_MAX) {
    errors.title_override = `Title must be ${YT_TITLE_MAX} characters or fewer`;
  }

  const desc = s.description_override || '';
  if (desc.length > YT_DESCRIPTION_MAX) {
    errors.description_override = `Description must be ${YT_DESCRIPTION_MAX} characters or fewer`;
  }

  const tags = Array.isArray(s.tags) ? s.tags : [];
  if (tags.length > YT_TAGS_MAX_COUNT) {
    errors.tags = `At most ${YT_TAGS_MAX_COUNT} tags`;
  }
  const tagChars = tags.join('').length;
  if (tagChars > YT_TAGS_MAX_CHARS) {
    errors.tags = `Tags total ${YT_TAGS_MAX_CHARS} characters max`;
  }

  if (s.privacy_status === 'scheduled' && !(s.schedule_publish_at || '').trim()) {
    errors.schedule_publish_at = 'Pick a publish date and time';
  }

  if (forPublish && s.made_for_kids === null) {
    errors.made_for_kids = 'Choose Made for Kids or Not made for kids (COPPA)';
  }

  if (forPublish && !(title || '').trim()) {
    // Title can fall back to post title — only warn if both empty handled by caller
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateThumbnailFile(file) {
  if (!file) return { ok: false, error: 'No file selected' };
  if (!YT_THUMB_ACCEPT.includes(file.type) && !/\.(jpe?g|png)$/i.test(file.name || '')) {
    return { ok: false, error: 'Thumbnail must be JPEG or PNG' };
  }
  if (file.size > YT_THUMB_MAX_BYTES) {
    return { ok: false, error: 'Thumbnail must be 2 MB or smaller' };
  }
  return { ok: true };
}

/** Check natural image dimensions for ~16:9 */
export function validateThumbnailAspect(width, height) {
  if (!width || !height) return { ok: false, error: 'Could not read image size' };
  const ratio = width / height;
  if (ratio < YT_THUMB_MIN_RATIO || ratio > YT_THUMB_MAX_RATIO) {
    return { ok: false, error: 'Thumbnail should be 16:9 (e.g. 1280×720)' };
  }
  return { ok: true };
}

export function loadImageDimensions(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}
