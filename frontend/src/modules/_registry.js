/**
 * Module registry — metadata for plug-and-play boundaries (documentation + tooling).
 */
export const MODULE_REGISTRY = {
  authentication: {
    entry: '@app/modules/authentication',
    description: 'Login, JWT session, OAuth callbacks',
  },
  workspace: {
    entry: '@app/modules/workspace',
    description: 'Active client context and switcher',
  },
  composer: {
    entry: '@app/modules/composer',
    description: 'Unified post composer and publish flows',
  },
  inbox: {
    entry: '@app/modules/inbox',
    description: 'Unified inbox and reviews',
  },
  social: {
    entry: '@app/modules/social',
    description: 'Platform catalog and channel filters',
  },
  analytics: {
    entry: '@app/modules/AnalyticsModule',
    description: 'Analytics route shell (lazy pages)',
  },
};
