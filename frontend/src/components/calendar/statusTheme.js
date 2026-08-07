/** Post status filters — ids match CAL_STATUS_FILTERS in constants.js */

export const CAL_STATUS_FILTERS = [
  { id: 'draft', label: 'Draft' },
  {
    id: 'pending_review',
    label: 'Pending Review',
    match: ['pending_review', 'pending_approval'],
  },
  { id: 'pending_client', label: 'Pending Client' },
  { id: 'approved', label: 'Approved' },
  { id: 'changes_requested', label: 'Changes Requested' },
  {
    id: 'rejected',
    label: 'Rejected',
    match: ['rejected', 'cancelled'],
  },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'publishing', label: 'Publishing', match: ['publishing', 'processing'] },
  {
    id: 'published',
    label: 'Published',
    match: ['published', 'partial'],
  },
  { id: 'failed', label: 'Failed' },
  { id: 'on_hold', label: 'On Hold', match: ['on_hold', 'queued'] },
];

const FILTER_BY_ID = Object.fromEntries(CAL_STATUS_FILTERS.map((f) => [f.id, f]));

let activeStatusFilters = CAL_STATUS_FILTERS;

/** Sync toolbar/legend filters after GET /api/calendar/post-statuses/. */
export function setActiveStatusFilters(filters) {
  activeStatusFilters = Array.isArray(filters) && filters.length
    ? filters.map((f) => ({
      id: f.id,
      label: f.label,
      match: f.match || [f.id],
    }))
    : CAL_STATUS_FILTERS;
}

export function getActiveStatusFilters() {
  return activeStatusFilters;
}

function filterByIdMap() {
  return Object.fromEntries(getActiveStatusFilters().map((f) => [f.id, f]));
}

/** Map API/post status string → filter id for styling & filtering. */
export function postStatusFilterKey(rawStatus) {
  const s = String(rawStatus || 'draft').toLowerCase();
  const filters = getActiveStatusFilters();
  const direct = filters.find((f) => f.id === s);
  if (direct) return direct.id;
  const alias = filters.find((f) => (f.match || []).includes(s));
  if (alias) return alias.id;
  return s;
}

export function statusLabelFor(rawStatus) {
  const key = postStatusFilterKey(rawStatus);
  return filterByIdMap()[key]?.label || FILTER_BY_ID[key]?.label || key.replace(/_/g, ' ');
}

export function statusMatchesFilter(rawStatus, selectedIds) {
  if (!selectedIds?.length) return true;
  const key = postStatusFilterKey(rawStatus);
  return selectedIds.includes(key);
}
