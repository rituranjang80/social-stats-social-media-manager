/* Calendar module — status/views catalogs */

export const CAL_VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'stats', label: 'Stats' },
];

export const CAL_MODES = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'list', label: 'List' },
];

export const CAL_STATUS_OPTIONS = [
  { id: '', label: 'All Posts' },
  { id: 'draft', label: 'Draft' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'failed', label: 'Failed' },
  { id: 'publishing', label: 'Processing' },
];

/** Channel filter — catalog ids shown in Brightbean-style multi-select */
export const CAL_CHANNEL_IDS = [
  'facebook',
  'instagram',
  'linkedin',
  'twitter',
  'threads',
  'pinterest',
  'tiktok',
  'youtube',
  'google_my_business',
];

export const DEFAULT_COMPOSE_TIME = '09:00';
