/* YouTube composer settings — defaults, limits, catalogs */

export const YT_TITLE_MAX = 100;
export const YT_DESCRIPTION_MAX = 5000;
export const YT_TAGS_MAX_COUNT = 30;
export const YT_TAGS_MAX_CHARS = 500;
export const YT_THUMB_MAX_BYTES = 2 * 1024 * 1024;
export const YT_THUMB_MIN_RATIO = 16 / 9 - 0.08;
export const YT_THUMB_MAX_RATIO = 16 / 9 + 0.08;
export const YT_THUMB_ACCEPT = ['image/jpeg', 'image/png', 'image/jpg'];

export const YT_PRIVACY_OPTIONS = [
  { id: 'public', label: 'Public', hint: 'Anyone can search for and view' },
  { id: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link can view' },
  { id: 'private', label: 'Private', hint: 'Only you can view' },
  { id: 'scheduled', label: 'Schedule publish', hint: 'Goes live at a set time (starts private)' },
];

export const YT_CATEGORIES = [
  { id: '1', label: 'Film & Animation' },
  { id: '2', label: 'Autos & Vehicles' },
  { id: '10', label: 'Music' },
  { id: '15', label: 'Pets & Animals' },
  { id: '17', label: 'Sports' },
  { id: '19', label: 'Travel & Events' },
  { id: '20', label: 'Gaming' },
  { id: '22', label: 'People & Blogs' },
  { id: '23', label: 'Comedy' },
  { id: '24', label: 'Entertainment' },
  { id: '25', label: 'News & Politics' },
  { id: '26', label: 'Howto & Style' },
  { id: '27', label: 'Education' },
  { id: '28', label: 'Science & Technology' },
  { id: '29', label: 'Nonprofits & Activism' },
];

export const YT_LICENSE_OPTIONS = [
  { id: 'youtube', label: 'Standard YouTube License' },
  { id: 'creativeCommon', label: 'Creative Commons — Attribution' },
];

export const YT_COMMENT_MODERATION = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'hold', label: 'Hold for review' },
  { id: 'disable', label: 'Disable comments' },
];

export const YT_COMMENT_SORT = [
  { id: 'top', label: 'Top comments' },
  { id: 'newest', label: 'Newest first' },
];

export const YT_SHORTS_REMIX = [
  { id: 'allow', label: 'Allow' },
  { id: 'moderate', label: 'Only after approval' },
  { id: 'disallow', label: 'Don’t allow' },
];

export const YT_CAPTION_CERT = [
  { id: 'none', label: 'None' },
  { id: '400', label: 'Captioned audio description (400)' },
  { id: '401', label: 'Transcript provided (401)' },
  { id: '402', label: 'Captions unknown / not required' },
];

/** Default persisted shape under platform_overrides.youtube */
export function createDefaultYoutubeSettings() {
  return {
    title_override: '',
    description_override: '',
    tags: [],
    category_id: '22',
    playlist_id: '',
    language: '',
    recording_date: '',
    recording_location: '',
    privacy_status: 'public',
    schedule_publish_at: '',
    is_premiere: false,
    made_for_kids: null,
    age_restriction: false,
    license: 'youtube',
    embeddable: true,
    publish_to_subscriptions: true,
    notify_subscribers: true,
    allow_comments: true,
    comment_moderation: 'automatic',
    sort_comments: 'top',
    paid_promotion: false,
    altered_content: false,
    automatic_chapters: true,
    automatic_places: true,
    automatic_concepts: true,
    automatic_tags: true,
    allow_remixing: true,
    shorts_remix: 'allow',
    video_language: '',
    caption_certification: 'none',
    default_audio_language: '',
    content_declaration: '',
    thumbnail_asset_id: null,
    thumbnail_url: '',
  };
}

export function normalizeYoutubeSettings(raw) {
  const base = createDefaultYoutubeSettings();
  if (!raw || typeof raw !== 'object') return base;
  const next = { ...base, ...raw };
  if (typeof next.tags === 'string') {
    next.tags = next.tags.split(',').map((t) => t.trim()).filter(Boolean);
  }
  if (!Array.isArray(next.tags)) next.tags = [];
  return next;
}

export function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

export function tagsFromInput(value) {
  return String(value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, YT_TAGS_MAX_COUNT);
}
