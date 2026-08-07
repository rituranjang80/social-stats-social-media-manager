import { postStatusFilterKey } from './statusTheme';

export const PUBLISH_LIST_TABS = [
  { id: 'queue', label: 'Queue', matchStatuses: ['scheduled', 'queued', 'publishing'] },
  { id: 'drafts', label: 'Drafts', matchStatuses: ['draft'] },
  { id: 'approvals', label: 'Approvals', panel: 'approvals' },
  { id: 'sent', label: 'Sent', matchStatuses: ['published', 'partial', 'failed', 'cancelled'] },
];

export const PUBLISH_LIST_TAB_IDS = PUBLISH_LIST_TABS.map((t) => t.id);

/** Brightbean Approvals sub-filters → composer DB status values. */
export const APPROVAL_STATUS_PILLS = [
  { id: 'all', label: 'All', matchStatuses: ['pending_approval', 'cancelled', 'queued', 'scheduled'] },
  { id: 'pending_review', label: 'Review', matchStatuses: ['pending_approval'] },
  { id: 'pending_client', label: 'Client', matchStatuses: ['pending_client'] },
  { id: 'approved', label: 'Approved', matchStatuses: ['queued', 'scheduled'] },
  { id: 'rejected', label: 'Rejected', matchStatuses: ['cancelled'] },
  { id: 'changes_requested', label: 'Changes', matchStatuses: ['changes_requested'] },
  { id: 'on_hold', label: 'Hold', matchStatuses: ['queued'] },
];

export function postMatchesStatuses(rawStatus, matchStatuses = []) {
  if (!matchStatuses?.length) return false;
  const key = postStatusFilterKey(rawStatus);
  return matchStatuses.some(
    (m) => m === rawStatus || m === key || postStatusFilterKey(m) === key,
  );
}

export function filterPostsByTab(posts, tab) {
  const def = PUBLISH_LIST_TABS.find((t) => t.id === tab);
  if (!def?.matchStatuses) return posts;
  return posts.filter((p) => postMatchesStatuses(p.status, def.matchStatuses));
}

export function countPostsByTab(allPosts) {
  const counts = {};
  PUBLISH_LIST_TABS.forEach((tab) => {
    if (tab.panel === 'approvals') {
      counts[tab.id] = allPosts.filter(
        (p) => p.source === 'composer' && postMatchesStatuses(
          p.status,
          APPROVAL_STATUS_PILLS[0].matchStatuses,
        ),
      ).length;
    } else {
      counts[tab.id] = filterPostsByTab(allPosts, tab.id).length;
    }
  });
  return counts;
}
