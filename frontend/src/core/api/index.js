/**
 * Public API facade — axios client and domain API modules.
 * Legacy: `services/api.js` re-exports this barrel for backward compatibility.
 */
export {
  default,
  default as apiClient,
  API_BASE,
  apiBaseUrl,
  refreshSessionTokens,
  publicApi,
} from './client';

export * from './auth';
export * from './users';
export * from './clients';
export * from './analytics';
export * from './calendar';
export * from './composer';
export * from './bots';
export * from './marketplace';
export * from './public';
export * from './notifications';
export * from './management';
export * from './ai';
export * from './monitoring';
export * from './competitors';
export * from './video';
export * from './inbox';
export * from './whatsapp';
export * from './privacy';
