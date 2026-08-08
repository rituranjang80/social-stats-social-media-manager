import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

import SocialPlatformIcon from '../ui/SocialPlatformIcon';
import { composerAPI } from '../../services/api';
import { confirmDialog, promptDialog } from '../../services/dialog';
import { postMatchesApprovalPill } from './publishListConfig';
import { postPassesToolbarFilters } from './utils';
import { postStatusFilterKey, statusLabelFor } from './statusTheme';

function mapComposerRow(row) {
  const platforms = row.target_platforms || [];
  return {
    id: row.id,
    source: 'composer',
    calendarKey: `composer-${row.id}`,
    title: row.title,
    caption: row.content,
    content: row.content,
    status: row.status,
    platforms,
    platform: platforms[0],
    scheduled_at: row.scheduled_at,
    created_at: row.created_at,
    media_type: row.media_type,
  };
}

function postInApprovalScope(post, approvalPills) {
  const pills = approvalPills || [];
  const allPill = pills.find((p) => p.id === 'all') || pills[0];
  if (!allPill?.match?.length) return true;
  return postMatchesApprovalPill(post, allPill.id, pills);
}

export default function PublishApprovalsPanel({
  clientId,
  basePath,
  canApprove,
  onChanged,
  approvalPills = [],
  toolbarFilter = {},
}) {
  const [pill, setPill] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await composerAPI.posts.list({ client_id: clientId, page_size: 200 });
      const payload = res.data;
      const batch = payload?.results || (Array.isArray(payload) ? payload : []);
      const mapped = batch.map(mapComposerRow).filter((p) => (
        postInApprovalScope(p, approvalPills)
        && postPassesToolbarFilters(p, toolbarFilter)
      ));
      setRows(mapped);
      setSelected(new Set());
    } catch {
      toast.error('Could not load approval posts');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, approvalPills, toolbarFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!approvalPills?.length) return;
    if (!approvalPills.some((p) => p.id === pill)) {
      setPill(approvalPills.find((p) => p.id === 'all')?.id || approvalPills[0].id);
    }
  }, [approvalPills, pill]);

  const visible = useMemo(
    () => rows.filter((p) => postMatchesApprovalPill(p, pill, approvalPills)),
    [rows, pill, approvalPills],
  );

  const pillCounts = useMemo(() => {
    const counts = {};
    (approvalPills || []).forEach((p) => {
      counts[p.id] = rows.filter((row) => postMatchesApprovalPill(row, p.id, approvalPills)).length;
    });
    return counts;
  }, [rows, approvalPills]);

  function toggleOne(post) {
    const key = String(post.id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function approveOne(post) {
    if (!canApprove) return;
    setBusy(true);
    try {
      await composerAPI.posts.approve(post.id);
      toast.success('Approved');
      await load();
      onChanged?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Approve failed');
    } finally {
      setBusy(false);
    }
  }

  async function rejectOne(post) {
    if (!canApprove) return;
    const ok = await confirmDialog({
      type: 'warning',
      title: 'Reject post',
      message: 'Reject this post? It will be cancelled.',
      confirmLabel: 'Reject',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await composerAPI.posts.cancel(post.id);
      toast.success('Rejected');
      await load();
      onChanged?.();
    } catch {
      toast.error('Reject failed');
    } finally {
      setBusy(false);
    }
  }

  async function bulkApprove() {
    const ids = visible.filter((p) => selected.has(String(p.id)) && p.status === 'pending_approval');
    if (!ids.length) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((p) => composerAPI.posts.approve(p.id)));
      toast.success(`Approved ${ids.length} post${ids.length > 1 ? 's' : ''}`);
      await load();
      onChanged?.();
    } catch {
      toast.error('Some approvals failed');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function bulkReject() {
    const ids = visible.filter((p) => selected.has(String(p.id)) && p.status === 'pending_approval');
    if (!ids.length) return;
    const reason = await promptDialog({
      title: `Reject ${ids.length} post${ids.length > 1 ? 's' : ''}`,
      message: 'Tell the creator why. This comment is shared with them.',
      placeholder: 'Reason for rejection…',
      confirmLabel: 'Reject all',
      required: true,
    });
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await Promise.all(ids.map((p) => composerAPI.posts.cancel(p.id)));
      toast.success(`Rejected ${ids.length} post${ids.length > 1 ? 's' : ''}`);
      await load();
      onChanged?.();
    } catch {
      toast.error('Reject failed');
    } finally {
      setBusy(false);
    }
  }

  const pendingSelectable = visible.filter((p) => p.status === 'pending_approval');

  return (
    <div className="bb-cal-approvals">
      <div className="bb-cal-approvals__pills" role="tablist" aria-label="Approval status">
        {approvalPills.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pill === p.id}
            className={`bb-cal-approvals__pill${pill === p.id ? ' is-active' : ''}`}
            onClick={() => setPill(p.id)}
          >
            {p.label}
            <span className="bb-cal-approvals__pill-count">{pillCounts[p.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bb-cal__loading">
          <Loader2 size={18} className="bb-cal__spin" />
          Loading approvals…
        </div>
      ) : null}

      {!loading && visible.length === 0 ? (
        <div className="bb-cal-approvals__empty">
          <div className="bb-cal-approvals__empty-icon" aria-hidden>
            <Check size={24} strokeWidth={2} />
          </div>
          <p className="bb-cal-approvals__empty-title">No posts pending approval</p>
          <p className="bb-cal-approvals__empty-copy">Posts submitted for review will appear here</p>
        </div>
      ) : null}

      {!loading && visible.length > 0 ? (
        <div className="bb-cal-approvals__list">
          {visible.map((post) => {
            const statusKey = postStatusFilterKey(post.status);
            const label = post.title || post.caption || '(untitled)';
            const checked = selected.has(String(post.id));
            const timeSrc = post.scheduled_at || post.created_at;
            const timeStr = timeSrc ? format(parseISO(timeSrc), 'MMM d, yyyy · h:mm a') : '';
            return (
              <article
                key={post.calendarKey}
                className={`bb-cal-approvals__card bb-cal__card--${statusKey}`}
              >
                <label className="bb-cal-approvals__check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={post.status !== 'pending_approval' || !canApprove}
                    onChange={() => toggleOne(post)}
                    aria-label={`Select ${label}`}
                  />
                </label>
                <div className="bb-cal-approvals__card-body">
                  <div className="bb-cal-approvals__card-head">
                    <span className="bb-cal-approvals__platforms">
                      {(post.platforms || []).slice(0, 4).map((pl) => (
                        <SocialPlatformIcon key={pl} platform={pl} size={16} />
                      ))}
                    </span>
                    <strong className="bb-cal-approvals__title">{label}</strong>
                    <span className={`bb-cal-approvals__status bb-cal-approvals__status--${statusKey}`}>
                      {statusLabelFor(post.status)}
                    </span>
                  </div>
                  <p className="bb-cal-approvals__excerpt">
                    {(post.caption || '').slice(0, 280) || '(no body)'}
                  </p>
                  {timeStr ? (
                    <div className="bb-cal-approvals__meta">{timeStr}</div>
                  ) : null}
                </div>
                <div className="bb-cal-approvals__actions">
                  {canApprove && post.status === 'pending_approval' ? (
                    <>
                      <button
                        type="button"
                        className="bb-cal-approvals__btn bb-cal-approvals__btn--approve"
                        disabled={busy}
                        onClick={() => approveOne(post)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="bb-cal-approvals__btn bb-cal-approvals__btn--reject"
                        disabled={busy}
                        onClick={() => rejectOne(post)}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  <Link
                    to={`${basePath}/analytics/composer/${post.id}`}
                    className="bb-cal-approvals__btn bb-cal-approvals__btn--ghost"
                  >
                    <ExternalLink size={14} aria-hidden />
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {selected.size > 0 && canApprove ? (
        <div className="bb-cal-approvals__bulk">
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="bb-cal-approvals__bulk-approve"
            disabled={busy || !pendingSelectable.some((p) => selected.has(String(p.id)))}
            onClick={bulkApprove}
          >
            Approve all
          </button>
          <button
            type="button"
            className="bb-cal-approvals__bulk-reject"
            disabled={busy}
            onClick={bulkReject}
          >
            Reject all
          </button>
          <button
            type="button"
            className="bb-cal-approvals__bulk-clear"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

PublishApprovalsPanel.propTypes = {
  clientId: PropTypes.string,
  basePath: PropTypes.string.isRequired,
  canApprove: PropTypes.bool,
  onChanged: PropTypes.func,
  approvalPills: PropTypes.arrayOf(PropTypes.object),
  toolbarFilter: PropTypes.object,
};
