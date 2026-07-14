/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
/**
 * Backward-compatible re-export of the shared social platform catalog.
 * Prefer importing from `constants/socialPlatforms` in new code.
 */
export {
  PLATFORMS,
  PLATFORM_LIST,
  METRIC_LABELS,
  SOCIAL_PLATFORM_CATALOG,
  OAUTH_PLATFORM_IDS,
  getPlatformMeta,
  getPlatformLabel,
  getPlatformIconKey,
  isPlatformConnected,
  fmt,
} from '../constants/socialPlatforms';
