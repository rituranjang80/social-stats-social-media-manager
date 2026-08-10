/* ============================================================================
 *  ErrorLogsPage — staff view of persisted backend exceptions (ErrorLog DB)
 * ========================================================================== */
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Copy,
  Loader2, Search, Trash2, X,
} from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import toast from '../../components/ui/toast';
import { errorMonitoringAPI } from '../../services/api';
import { confirmDialog } from '../../services/dialog';
import { useFromAccountSettingsBack } from '../../hooks/useFromAccountSettingsBack';

const SEVERITY_VARIANT = {
  INFO: 'default',
  WARNING: 'warning',
  ERROR: 'danger',
  CRITICAL: 'danger',
};

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ErrorLogsPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState({
    search: '',
    severity: '',
    resolved: '',
  });
  const backHref = useFromAccountSettingsBack('more');

  const pageSize = 50;

  const refetch = useCallback(() => {
    setLoading(true);
    const params = { page, ordering: '-created_at' };
    if (filter.search) params.search = filter.search;
    if (filter.severity) params.severity = filter.severity;
    if (filter.resolved) params.resolved = filter.resolved;
    errorMonitoringAPI
      .list(params)
      .then((r) => {
        setRows(r.data?.results || []);
        setCount(r.data?.count ?? 0);
      })
      .catch(() => toast.error('Could not load error logs'))
      .finally(() => setLoading(false));
  }, [page, filter.search, filter.severity, filter.resolved]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setPage(1);
  }, [filter.search, filter.severity, filter.resolved]);

  function openDetail(id) {
    setDetailLoading(true);
    setDetail({ id });
    errorMonitoringAPI
      .get(id)
      .then((r) => setDetail(r.data))
      .catch(() => {
        toast.error('Could not load error detail');
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }

  function copyText(label, text) {
    if (!text) {
      toast.error(`No ${label} to copy`);
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied`),
      () => toast.error('Copy failed'),
    );
  }

  async function markResolved() {
    if (!detail?.id) return;
    try {
      const r = await errorMonitoringAPI.resolve(detail.id, { notes: detail.notes || '' });
      setDetail(r.data);
      toast.success('Marked resolved');
      refetch();
    } catch {
      toast.error('Could not resolve');
    }
  }

  async function removeLog() {
    if (!detail?.id) return;
    if (!await confirmDialog({
      type: 'delete',
      title: 'Delete error log',
      message: 'Delete this error log permanently?',
      confirmLabel: 'Delete',
      danger: true,
    })) return;
    try {
      await errorMonitoringAPI.delete(detail.id);
      toast.success('Deleted');
      setDetail(null);
      refetch();
    } catch {
      toast.error('Could not delete');
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div style={{ paddingBottom: 32 }}>
      <PageHeader
        title="Error logs"
        subtitle="All captured backend exceptions stored in the database (staff / superadmin)"
        backHref={backHref}
      />

      <div style={{ padding: '0 24px' }}>
        <Card padding="sm" style={{
          padding: 12, marginBottom: 12,
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} color="var(--text-tertiary)"
                    style={{ position: 'absolute', top: 11, left: 10 }} />
            <input
              placeholder="Search message, type, path, stack…"
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              style={{ ...inputStyle, paddingLeft: 30 }}
            />
          </div>
          <select
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            style={inputStyle}
          >
            <option value="">All severities</option>
            <option value="INFO">INFO</option>
            <option value="WARNING">WARNING</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
          <select
            value={filter.resolved}
            onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
            style={inputStyle}
          >
            <option value="">Open + resolved</option>
            <option value="false">Unresolved only</option>
            <option value="true">Resolved only</option>
          </select>
        </Card>

        {loading && (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Loader2 size={18} className="ds-spin" color="var(--text-tertiary)" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <Card padding="none" style={{ overflow: 'hidden' }}>
            <EmptyState
              icon={AlertTriangle}
              title="No error logs yet"
              description="When the API or background jobs fail, entries appear here with a unique error ID."
            />
          </Card>
        )}

        {!loading && rows.length > 0 && (
          <>
            <Card padding="none" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={th}>When</th>
                    <th style={th}>Severity</th>
                    <th style={th}>Type</th>
                    <th style={th}>Message</th>
                    <th style={th}>Path</th>
                    <th style={th}>User</th>
                    <th style={th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openDetail(r.id)}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-sunken)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={td}>{formatWhen(r.created_at)}</td>
                      <td style={td}>
                        <Badge variant={SEVERITY_VARIANT[r.severity] || 'default'} dot>
                          {r.severity}
                        </Badge>
                      </td>
                      <td style={td}>
                        <code style={{ fontSize: 11 }}>{r.exception_type}</code>
                      </td>
                      <td style={{ ...td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.exception_message || '—'}
                      </td>
                      <td style={td}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                          {r.request_path || '—'}
                        </span>
                      </td>
                      <td style={td}>{r.username || '—'}</td>
                      <td style={td}>
                        {r.resolved
                          ? <Badge variant="success">Resolved</Badge>
                          : <Badge variant="warning">Open</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 12, fontSize: 13, color: 'var(--text-secondary)',
            }}>
              <span>{count} total · page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={ChevronLeft}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  iconRight={ChevronRight}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)', display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setDetail(null)}
        >
          <div
            style={{
              width: 'min(720px, 100vw)', height: '100%',
              background: 'var(--surface-card)',
              borderLeft: '1px solid var(--border-subtle)',
              overflow: 'auto',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Error detail</h2>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {detail.id}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Close" style={iconBtn}>
                <X size={18} />
              </button>
            </div>

            {detailLoading && (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <Loader2 size={18} className="ds-spin" />
              </div>
            )}

            {!detailLoading && detail.exception_type && (
              <>
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Badge variant={SEVERITY_VARIANT[detail.severity] || 'default'}>{detail.severity}</Badge>
                  {detail.resolved
                    ? <Badge variant="success">Resolved</Badge>
                    : <Badge variant="warning">Open</Badge>}
                  {detail.response_status_code != null && (
                    <Badge variant="default">HTTP {detail.response_status_code}</Badge>
                  )}
                </div>

                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>{detail.exception_type}</p>
                <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {detail.exception_message}
                </p>

                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <Button variant="secondary" size="sm" iconLeft={Copy}
                          onClick={() => copyText('Stack trace', detail.full_stack_trace)}>
                    Copy stack
                  </Button>
                  <Button variant="secondary" size="sm" iconLeft={Copy}
                          onClick={() => copyText('Request body', JSON.stringify(detail.request_body, null, 2))}>
                    Copy body
                  </Button>
                  {!detail.resolved && (
                    <Button variant="secondary" size="sm" iconLeft={CheckCircle2} onClick={markResolved}>
                      Mark resolved
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" iconLeft={Trash2} onClick={removeLog}>
                    Delete
                  </Button>
                </div>

                {detail.suggestion && (
                  <pre style={preBlock}>{detail.suggestion}</pre>
                )}

                <h3 style={sectionTitle}>Request</h3>
                <pre style={preBlockSmall}>
                  {detail.request_method} {detail.request_path}
                  {'\n'}
                  {detail.request_url}
                </pre>

                <h3 style={sectionTitle}>Stack trace</h3>
                <pre style={preBlock}>{detail.full_stack_trace || '—'}</pre>

                {detail.screenshot_url ? (
                  <>
                    <h3 style={sectionTitle}>Screenshot</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                      Saved under media (Docker: host <code>data/media/error_screenshots/</code>).
                    </p>
                    <a
                      href={detail.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-block', marginTop: 8, fontSize: 13, fontWeight: 600 }}
                    >
                      Open full image
                    </a>
                    <img
                      src={detail.screenshot_url}
                      alt="Error screenshot"
                      style={{
                        display: 'block',
                        marginTop: 12,
                        maxWidth: '100%',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <style>{`.ds-spin { animation: ds-spin 0.9s linear infinite; } @keyframes ds-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  background: 'var(--surface-card)',
  color: 'var(--text-primary)',
  fontSize: 13,
  minWidth: 140,
};

const th = {
  textAlign: 'left',
  padding: '10px 14px',
  borderBottom: '1px solid var(--border-subtle)',
  color: 'var(--text-tertiary)',
  fontWeight: 600,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const td = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--border-subtle)',
  verticalAlign: 'top',
};

const preBlock = {
  marginTop: 8,
  padding: 12,
  background: 'var(--surface-sunken)',
  borderRadius: 'var(--radius-md)',
  fontSize: 11,
  lineHeight: 1.45,
  overflow: 'auto',
  maxHeight: 320,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const preBlockSmall = { ...preBlock, maxHeight: 120 };

const sectionTitle = {
  margin: '20px 0 8px',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-tertiary)',
};

const iconBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  padding: 4,
};
