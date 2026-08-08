import { postStatusFilterKey } from './statusTheme';

export function postMatchesStatuses(rawStatus, matchStatuses = []) {
  if (!matchStatuses?.length) return false;
  const key = postStatusFilterKey(rawStatus);
  return matchStatuses.some(
    (m) => m === rawStatus || m === key || postStatusFilterKey(m) === key,
  );
}

export function findListTab(listTabs, tabId) {
  return (listTabs || []).find((t) => t.id === tabId);
}

export function isApprovalsListTab(listTab, listTabs) {
  const def = findListTab(listTabs, listTab);
  return def?.panel === 'approvals';
}

export function filterPostsByTab(posts, tabId, listTabs) {
  const def = findListTab(listTabs, tabId);
  if (!def || def.panel === 'approvals' || !def.match?.length) return posts;
  return posts.filter((p) => postMatchesStatuses(p.status, def.match));
}

export function approvalScopeMatches(post, approvalPills) {
  const pills = approvalPills || [];
  if (!pills.length) return post?.source === 'composer';
  const allPill = pills.find((p) => p.id === 'all') || pills[0];
  if (!allPill?.match?.length) return post?.source === 'composer';
  return post?.source === 'composer' && postMatchesStatuses(post.status, allPill.match);
}

export function countPostsByTab(allPosts, listTabs, approvalPills) {
  const counts = {};
  (listTabs || []).forEach((tab) => {
    if (tab.panel === 'approvals') {
      counts[tab.id] = allPosts.filter((p) => approvalScopeMatches(p, approvalPills)).length;
    } else {
      counts[tab.id] = filterPostsByTab(allPosts, tab.id, listTabs).length;
    }
  });
  return counts;
}

export function postMatchesApprovalPill(post, pillId, approvalPills) {
  const pill = (approvalPills || []).find((p) => p.id === pillId)
    || (approvalPills || []).find((p) => p.id === 'all')
    || (approvalPills || [])[0];
  if (!pill?.match?.length) return true;
  const raw = String(post?.status || '').toLowerCase();
  return pill.match.some(
    (m) => m === raw || postStatusFilterKey(raw) === postStatusFilterKey(m),
  );
}

export function listTabIds(listTabs) {
  return (listTabs || []).map((t) => t.id);
}

export function defaultListTabId(listTabs) {
  const ids = listTabIds(listTabs);
  if (ids.includes('queue')) return 'queue';
  return ids[0] || 'queue';
}
