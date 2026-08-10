/**
 * Configuration facade — single import path for env-driven config.
 */
export { default as branding } from '../../config/branding';
export * from '../../config/branding';
export * from '../../config/inbox';
export { OAUTH_PLATFORM_IDS, getPlatformMeta, SOCIAL_PLATFORM_CATALOG } from '../../constants/socialPlatforms';
