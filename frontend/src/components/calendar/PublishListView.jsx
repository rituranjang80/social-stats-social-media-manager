import PropTypes from 'prop-types';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PublishApprovalsPanel from './PublishApprovalsPanel';
import {
  countPostsByTab,
  filterPostsByTab,
  isApprovalsListTab,
} from './publishListConfig';
import { flattenPosts, groupPostsByDateForList } from './utils';

const AgendaView = lazy(() => import('./AgendaView'));

function TabFallback() {
  return (
    <div className="bb-cal__loading">
      <Loader2 size={18} className="bb-cal__spin" />
    </div>
  );
}

export default function PublishListView({
  listTab,
  onListTabChange,
  postsByDate,
  listTabs,
  approvalPills,
  toolbarFilter,
  basePath,
  clientId,
  canApprove,
  onRefresh,
  agendaProps,
  configLoading,
  configError,
  onRetryConfig,
  postsLoading,
}) {
  const tabs = listTabs?.length ? listTabs : [];
  const allPosts = flattenPosts(postsByDate);
  const tabCounts = countPostsByTab(allPosts, tabs, approvalPills);
  const onApprovalsTab = isApprovalsListTab(listTab, tabs) || listTab === 'approvals';

  const tabPosts = onApprovalsTab
    ? []
    : filterPostsByTab(allPosts, listTab, tabs);
  const tabPostsByDate = groupPostsByDateForList(tabPosts);

  if (configLoading && !tabs.length) {
    return (
      <div className="bb-cal__loading">
        <Loader2 size={18} className="bb-cal__spin" />
        Loading publish lists…
      </div>
    );
  }

  if (configError && !tabs.length) {
    return (
      <div className="bb-cal__empty">
        <h3 className="bb-cal__empty-title">Publish list unavailable</h3>
        <p className="bb-cal__empty-copy">{configError}</p>
        {onRetryConfig ? (
          <button type="button" className="bb-cal__today-btn" onClick={() => onRetryConfig()}>
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bb-cal-publish-list">
      <div className="bb-cal-publish-list__tabs" role="tablist" aria-label="Publish lists">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={listTab === tab.id}
            className={`bb-cal-publish-list__tab${listTab === tab.id ? ' is-active' : ''}`}
            onClick={() => onListTabChange(tab.id)}
          >
            {tab.label}
            <span className="bb-cal-publish-list__tab-count">{tabCounts[tab.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="bb-cal-publish-list__panel" role="tabpanel">
        {onApprovalsTab ? (
          <PublishApprovalsPanel
            clientId={clientId}
            basePath={basePath}
            canApprove={canApprove}
            onChanged={onRefresh}
            approvalPills={approvalPills}
            toolbarFilter={toolbarFilter}
          />
        ) : postsLoading ? (
          <div className="bb-cal__loading">
            <Loader2 size={18} className="bb-cal__spin" />
            Loading posts…
          </div>
        ) : (
          <Suspense fallback={<TabFallback />}>
            <AgendaView
              {...agendaProps}
              postsByDate={tabPostsByDate}
              scope="all"
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

PublishListView.propTypes = {
  listTab: PropTypes.string.isRequired,
  onListTabChange: PropTypes.func.isRequired,
  postsByDate: PropTypes.object,
  listTabs: PropTypes.arrayOf(PropTypes.object),
  approvalPills: PropTypes.arrayOf(PropTypes.object),
  toolbarFilter: PropTypes.object,
  basePath: PropTypes.string.isRequired,
  clientId: PropTypes.string,
  canApprove: PropTypes.bool,
  onRefresh: PropTypes.func,
  agendaProps: PropTypes.object,
  configLoading: PropTypes.bool,
  configError: PropTypes.string,
  onRetryConfig: PropTypes.func,
  postsLoading: PropTypes.bool,
};
