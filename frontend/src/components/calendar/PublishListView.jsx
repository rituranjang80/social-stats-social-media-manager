import PropTypes from 'prop-types';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import PublishApprovalsPanel from './PublishApprovalsPanel';
import {
  PUBLISH_LIST_TABS,
  countPostsByTab,
  filterPostsByTab,
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
  basePath,
  clientId,
  canApprove,
  onRefresh,
  agendaProps,
}) {
  const allPosts = flattenPosts(postsByDate);
  const tabCounts = countPostsByTab(allPosts);

  const tabPosts = listTab === 'approvals'
    ? []
    : filterPostsByTab(allPosts, listTab);
  const tabPostsByDate = groupPostsByDateForList(tabPosts);

  return (
    <div className="bb-cal-publish-list">
      <div className="bb-cal-publish-list__tabs" role="tablist" aria-label="Publish lists">
        {PUBLISH_LIST_TABS.map((tab) => (
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
        {listTab === 'approvals' ? (
          <PublishApprovalsPanel
            clientId={clientId}
            basePath={basePath}
            canApprove={canApprove}
            onChanged={onRefresh}
          />
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
  basePath: PropTypes.string.isRequired,
  clientId: PropTypes.string,
  canApprove: PropTypes.bool,
  onRefresh: PropTypes.func,
  agendaProps: PropTypes.object,
};
