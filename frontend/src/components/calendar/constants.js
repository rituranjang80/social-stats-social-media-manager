/* Calendar module — status/views catalogs */
import { CAL_STATUS_FILTERS } from './statusTheme';

export { CAL_STATUS_FILTERS };

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

/** @deprecated use CAL_STATUS_FILTERS — kept for any legacy imports */
export const CAL_STATUS_OPTIONS = [
  { id: '', label: 'All Posts' },
  ...CAL_STATUS_FILTERS.map((f) => ({ id: f.id, label: f.label })),
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
