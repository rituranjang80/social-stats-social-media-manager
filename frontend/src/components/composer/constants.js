import {
  OAUTH_PLATFORM_IDS,
  SOCIAL_PLATFORM_CATALOG,
  getPlatformMeta,
} from '../../constants/socialPlatforms';

/** Composer publish targets — live OAuth platforms only. */
export const PLATFORMS = OAUTH_PLATFORM_IDS.map((id) => {
  const m = getPlatformMeta(id);
  return {
    id,
    label: m.label,
    short: m.shortLabel,
    color: m.color,
    maxText: ({
      facebook: 63206,
      instagram: 2200,
      youtube: 5000,
      linkedin: 3000,
      google_my_business: 1500,
    })[id] || 2200,
    types: ({
      facebook: ['text', 'image', 'video', 'carousel', 'reel'],
      instagram: ['image', 'video', 'carousel', 'reel', 'story'],
      youtube: ['video', 'reel'],
      linkedin: ['text', 'image', 'video', 'carousel'],
      google_my_business: ['text', 'image'],
    })[id] || ['text', 'image'],
  };
});

export { SOCIAL_PLATFORM_CATALOG, OAUTH_PLATFORM_IDS };

export const MEDIA_TYPES = [
  { id: 'text', label: 'Text only' },
  { id: 'image', label: 'Image' },
  { id: 'video', label: 'Video' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'reel', label: 'Reel' },
  { id: 'story', label: 'Story' },
];

export const SCHEDULE_MODES = [
  { id: 'now', label: 'Now' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'queue', label: 'Add to Queue' },
];

/** Platforms that support posting a first comment after publish */
export const FIRST_COMMENT_PLATFORMS = ['facebook', 'instagram', 'linkedin'];

export function supportsFirstComment(platformIds = []) {
  return platformIds.some((id) => FIRST_COMMENT_PLATFORMS.includes(id));
}

export function toLocalInput(iso) {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 16);
}

export function shade(hex, pct) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let n = parseInt(m[1], 16);
  let r = (n >> 16) + Math.round(255 * pct / 100);
  let g = ((n >> 8) & 0xff) + Math.round(255 * pct / 100);
  let b = (n & 0xff) + Math.round(255 * pct / 100);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Build datetime-local value from ?scheduled_date=&scheduled_time= query params */
export function scheduleFromQuery(searchParams) {
  const date = searchParams.get('scheduled_date');
  const time = searchParams.get('scheduled_time') || '09:00';
  if (!date) return null;
  return `${date}T${time.slice(0, 5)}`;
}
