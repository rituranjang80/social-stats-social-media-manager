/* ============================================================================
 * Canonical social platform catalog — used by Settings, Composer, Composer
 * connect rail, pills, and icons. Live Connectability comes from the API
 * catalog (env credentials); oauthEnabled here is only a static UI fallback.
 * ========================================================================== */

/** Live OAuth + analytics sync (matches backend PLATFORM_CHOICES). */
export const OAUTH_PLATFORM_IDS = [
  'facebook',
  'instagram',
  'youtube',
  'linkedin',
  'google_my_business',
];

/**
 * Full catalog inspired by SS social-accounts connect page.
 * order = display order on settings connect grid.
 */
export const SOCIAL_PLATFORM_CATALOG = [
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'FB',
    subtitle: 'Your Pages & Groups',
    color: '#1877F2',
    bg: '#EBF3FF',
    variant: 'gradient-blue',
    oauthEnabled: true,
    oauthProvider: 'facebook',
    metrics: ['impressions', 'reach', 'clicks', 'likes', 'followers', 'profile_views'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'IG',
    subtitle: 'For accounts linked to a Facebook Page',
    color: '#E1306C',
    bg: '#FDE8F0',
    variant: 'gradient-instagram',
    oauthEnabled: true,
    oauthProvider: 'facebook',
    metrics: ['impressions', 'reach', 'clicks', 'likes', 'saves', 'video_views', 'followers'],
  },
  {
    id: 'instagram_login',
    label: 'Instagram Login',
    shortLabel: 'IG+',
    subtitle: 'Sign in with Instagram · no Facebook needed',
    color: '#E1306C',
    bg: '#FDE8F0',
    variant: 'gradient-instagram',
    oauthEnabled: false,
    icon: 'instagram',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    shortLabel: 'in',
    subtitle: 'Company & personal publishing',
    color: '#0A66C2',
    bg: '#E8F0F9',
    variant: 'pattern-linkedin',
    oauthEnabled: true,
    oauthProvider: 'linkedin',
    metrics: ['impressions', 'clicks', 'followers', 'engagement_rate'],
  },
  {
    id: 'linkedin_personal',
    label: 'LinkedIn Personal',
    shortLabel: 'in',
    subtitle: 'Personal profile',
    color: '#0A66C2',
    bg: '#E8F0F9',
    variant: 'pattern-linkedin',
    oauthEnabled: false,
    icon: 'linkedin',
  },
  {
    id: 'linkedin_company',
    label: 'LinkedIn Company',
    shortLabel: 'in',
    subtitle: 'Company pages',
    color: '#0A66C2',
    bg: '#E8F0F9',
    variant: 'pattern-linkedin',
    oauthEnabled: false,
    icon: 'linkedin',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TT',
    subtitle: 'Video content',
    color: '#010101',
    bg: '#F3F4F6',
    variant: 'glass-dark',
    oauthEnabled: false,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    shortLabel: 'YT',
    subtitle: 'Videos & Shorts',
    color: '#FF0000',
    bg: '#FFE9E9',
    variant: 'glass-light',
    oauthEnabled: true,
    oauthProvider: 'google',
    metrics: ['video_views', 'impressions', 'likes', 'comments', 'shares', 'followers', 'ctr'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    shortLabel: 'Pin',
    subtitle: 'Pins & Boards',
    color: '#BD081C',
    bg: '#FDE8EB',
    variant: 'glass-light',
    oauthEnabled: false,
  },
  {
    id: 'threads',
    label: 'Threads',
    shortLabel: 'Th',
    subtitle: 'Text & Media',
    color: '#000000',
    bg: '#F3F4F6',
    variant: 'glass-light',
    oauthEnabled: false,
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    shortLabel: 'BS',
    subtitle: 'AT Protocol',
    color: '#0085FF',
    bg: '#E6F4FF',
    variant: 'glass-light',
    oauthEnabled: false,
  },
  {
    id: 'google_my_business',
    label: 'Google Business',
    shortLabel: 'GMB',
    subtitle: 'Local posts & insights',
    color: '#34A853',
    bg: '#E6F4EA',
    variant: 'glass-light',
    oauthEnabled: true,
    oauthProvider: 'google',
    metrics: ['impressions', 'website_clicks', 'phone_calls', 'direction_requests'],
  },
  {
    id: 'mastodon',
    label: 'Mastodon',
    shortLabel: 'Mas',
    subtitle: 'Federated social',
    color: '#6364FF',
    bg: '#EEF0FF',
    variant: 'glass-light',
    oauthEnabled: false,
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    shortLabel: 'X',
    subtitle: 'Posts & engagement',
    color: '#000000',
    bg: '#F3F4F6',
    variant: 'glass-dark',
    oauthEnabled: false,
    icon: 'twitter',
  },
];

/** Map id → meta for O(1) lookup (legacy PLATFORMS shape). */
export const PLATFORMS = Object.fromEntries(
  SOCIAL_PLATFORM_CATALOG
    .filter((p) => p.oauthEnabled)
    .map((p) => [
      p.id,
      {
        label: p.label,
        shortLabel: p.shortLabel,
        color: p.color,
        bg: p.bg,
        metrics: p.metrics || [],
      },
    ]),
);

export const PLATFORM_LIST = Object.keys(PLATFORMS);

export const METRIC_LABELS = {
  impressions: 'Impressions',
  reach: 'Reach',
  clicks: 'Clicks',
  likes: 'Likes',
  comments: 'Comments',
  shares: 'Shares',
  saves: 'Saves',
  video_views: 'Video Views',
  followers: 'Followers',
  profile_views: 'Profile Views',
  website_clicks: 'Website Clicks',
  phone_calls: 'Phone Calls',
  direction_requests: 'Direction Requests',
  engagement_rate: 'Engagement Rate',
  ctr: 'CTR',
  sessions: 'Sessions',
  users: 'Users',
  page_views: 'Page Views',
};

export function getPlatformMeta(platformId) {
  return SOCIAL_PLATFORM_CATALOG.find((p) => p.id === platformId) || null;
}

export function getPlatformLabel(platform, { short = false } = {}) {
  const meta = getPlatformMeta(platform) || PLATFORMS[platform];
  if (!meta) return platform;
  return short ? meta.shortLabel || meta.label : meta.label;
}

export function getPlatformIconKey(platformId) {
  const meta = getPlatformMeta(platformId);
  return meta?.icon || platformId;
}

export function isPlatformConnected(statusEntry) {
  if (!statusEntry) return false;
  return statusEntry.status === 'active' || statusEntry.status === 'expired';
}

export function fmt(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}
