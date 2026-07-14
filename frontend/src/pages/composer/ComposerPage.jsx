/* ============================================================================
 * Social Stats — Social Media Management & Marketing Platform
 * Author    : Chandrabhan Shekhawat
 * Company   : Gigai Kripa Services
 * Website   : https://gigaikripaservices.com/
 * Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 * Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Calendar, Send, Save, Eye, Wand2, Hash, Clock, Loader2, Building2, StickyNote,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import AIWriteButton from '../../components/ai/AIWriteButton';
import { TPill, TPanel, TActionBar, TDropzone, TCharBar } from '../../components/t';
import { ComposerPlatformPills, ComposerMediaThumbs } from '../../components/composer/ComposerPlatformPills';
import { ComposerPreviewCard, ComposerPreflight } from '../../components/composer/ComposerPreview';
import ComposerConnectChannels from '../../components/composer/ComposerConnectChannels';
import ComposerFirstComment from '../../components/composer/ComposerFirstComment';
import ComposerTags from '../../components/composer/ComposerTags';
import ComposerWorkspaceRail from '../../components/composer/ComposerWorkspaceRail';
import ComposerTenantBar from '../../components/composer/ComposerTenantBar';
import {
  PLATFORMS, MEDIA_TYPES, SCHEDULE_MODES,
  toLocalInput, scheduleFromQuery, supportsFirstComment,
} from '../../components/composer/constants';
import { composerAPI, captionAPI, hashtagAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import useComposerTenant from '../../hooks/useComposerTenant';
import { useComposerPost } from '../../hooks/useComposer';

import '../../styles/scss/composer.scss';

export default function ComposerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, can } = useAuth();

  const isEditing = !!id;
  const { data: existing, loading: loadingExisting } = useComposerPost(id);
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const isAdminShell = location.pathname.startsWith('/admin');
  const settingsPath = isAdminShell && user?.client_id
    ? `/admin/client/${user.client_id}/settings`
    : `${basePath}/settings`;

  const tenant = useComposerTenant({ user, can, isAdminShell });

  /* ── Editor state ───────────────────────────────────────────────────── */
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [tags, setTags] = useState([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [mediaType, setMediaType] = useState('text');
  const [mediaAssets, setMediaAssets] = useState([]);
  const [targetPlatforms, setTargetPlatforms] = useState(['facebook', 'instagram']);
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [preflight, setPreflight] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [activePreview, setActivePreview] = useState(targetPlatforms[0] || 'facebook');
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    const fromQuery = scheduleFromQuery(searchParams);
    if (fromQuery) {
      setScheduleMode('schedule');
      setScheduledAt(fromQuery);
    }
  }, [searchParams, isEditing]);

  useEffect(() => {
    if (existing && isEditing) {
      setTitle(existing.title || '');
      setContent(existing.content || '');
      setFirstComment(existing.first_comment || '');
      setTags(Array.isArray(existing.tags) ? existing.tags : []);
      setInternalNotes(existing.internal_notes || '');
      setMediaType(existing.media_type || 'text');
      setTargetPlatforms(existing.target_platforms || []);
      if (existing.scheduled_at) {
        setScheduleMode('schedule');
        setScheduledAt(toLocalInput(existing.scheduled_at));
      }
    }
  }, [existing, isEditing]);

  useEffect(() => {
    if (!targetPlatforms.includes(activePreview) && targetPlatforms[0]) {
      setActivePreview(targetPlatforms[0]);
    }
  }, [targetPlatforms, activePreview]);

  const counts = useMemo(() => (
    PLATFORMS.reduce((acc, p) => {
      acc[p.id] = { used: content.length, max: p.maxText, over: content.length > p.maxText };
      return acc;
    }, {})
  ), [content]);

  const primaryMax = useMemo(() => {
    const first = PLATFORMS.find((p) => targetPlatforms.includes(p.id)) || PLATFORMS[0];
    return first.maxText;
  }, [targetPlatforms]);

  const workspaceLabel = tenant.workspace?.label
    || (user?.role === 'client' ? 'Workspace' : 'Team workspace');

  const roleLabel = tenant.roleLabel;

  const showFirstComment = supportsFirstComment(targetPlatforms);

  function togglePlatform(pid) {
    setTargetPlatforms((cur) => (cur.includes(pid)
      ? cur.filter((x) => x !== pid)
      : [...cur, pid]));
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await composerAPI.media.upload(fd);
      setMediaAssets((cur) => {
        const next = [...cur, res.data];
        if (cur.length === 0) {
          if ((res.data.mime_type || '').startsWith('video/')) setMediaType('video');
          else setMediaType('image');
        } else if (cur.length === 1) {
          setMediaType('carousel');
        }
        return next;
      });
      toast.success('Uploaded');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed');
    }
  }

  function onDropFiles(files) {
    files.forEach((f) => uploadFile(f));
  }

  function removeAsset(idx) {
    setMediaAssets((cur) => cur.filter((_, i) => i !== idx));
  }

  function buildPayload() {
    return {
      title: title.trim(),
      content,
      first_comment: firstComment,
      tags,
      internal_notes: internalNotes,
      media_type: mediaType,
      target_platforms: targetPlatforms,
      media_urls: mediaAssets.map((a) => `asset:${a.id}`),
    };
  }

  async function ensurePost() {
    const payload = buildPayload();
    if (isEditing) {
      const res = await composerAPI.posts.update(id, payload);
      return res.data;
    }
    const res = await composerAPI.posts.create(payload);
    navigate(`${basePath}/analytics/composer/${res.data.id}`, { replace: true });
    return res.data;
  }

  async function onSaveDraft() {
    if (!validate()) return;
    setSaving(true);
    try {
      await ensurePost();
      toast.success('Draft saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onPreflight() {
    setPreflight(null);
    try {
      const res = await composerAPI.preflight({
        ...buildPayload(),
        media_assets: mediaAssets.map((a) => a.id),
      });
      setPreflight(res.data);
      if (res.data.ok) toast.success('Preflight passed — ready to publish');
      else toast.error('Preflight found issues — see details below');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Preflight failed');
    }
  }

  async function onSchedule() {
    if (!validate()) return;
    if (!scheduledAt) { toast.error('Pick a future date/time first'); return; }
    setSaving(true);
    try {
      const post = await ensurePost();
      await composerAPI.posts.schedule(post.id, new Date(scheduledAt).toISOString());
      toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Schedule failed');
    } finally {
      setSaving(false);
    }
  }

  async function onPublishNow() {
    if (!validate()) return;
    setSaving(true);
    try {
      const post = await ensurePost();
      const res = await composerAPI.posts.publishNow(post.id);
      if (res.data?.status === 'pending_approval') toast.success('Sent for approval');
      else toast.success('Publishing — check status in a few seconds');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  function validate() {
    if (mediaType === 'text' && !content.trim()) {
      toast.error('Add some text first'); return false;
    }
    if (mediaType !== 'text' && mediaAssets.length === 0) {
      toast.error('Upload at least one media file'); return false;
    }
    if (targetPlatforms.length === 0) {
      toast.error('Pick at least one platform'); return false;
    }
    return true;
  }

  async function aiCompose() {
    setAiBusy(true);
    try {
      const res = await captionAPI.generate({
        topic: title || 'general post',
        tone: 'friendly',
        post_type: 'announcement',
        platforms: targetPlatforms,
        keywords: '',
        call_to_action: '',
      });
      const captions = res.data?.captions || res.data?.generated_captions || {};
      const first = targetPlatforms.find((p) => captions[p]) || Object.keys(captions)[0];
      if (first && captions[first]) setContent(captions[first]);
      else toast.error('AI did not return a caption');
    } catch (e) {
      toast.error('AI compose failed');
    } finally {
      setAiBusy(false);
    }
  }

  async function aiHashtags() {
    setAiBusy(true);
    try {
      const res = await hashtagAPI.generate({
        niche: title || content.slice(0, 60) || 'general',
        platform: targetPlatforms[0] || 'instagram',
      });
      const hashTags = (res.data?.hashtags?.suggested || res.data?.hashtags || [])
        .slice(0, 8)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .join(' ');
      if (hashTags) setContent((c) => `${c}${c && !c.endsWith('\n') ? '\n\n' : ''}${hashTags}`);
      else toast.error('No hashtags returned');
    } catch (e) {
      toast.error('AI hashtags failed');
    } finally {
      setAiBusy(false);
    }
  }

  if (loadingExisting && isEditing) {
    return (
      <div className="composer__loading">
        <Loader2 size={20} className="composer__spin" />
        Loading post…
      </div>
    );
  }

  const charItems = targetPlatforms.map((pid) => {
    const p = PLATFORMS.find((x) => x.id === pid);
    const c = counts[pid];
    return { id: pid, label: p?.label || pid, used: c.used, max: c.max, over: c.over };
  });

  const connectProps = {
    clientId: user?.client_id,
    settingsPath,
    selectedPlatforms: targetPlatforms,
    onTogglePlatform: togglePlatform,
  };

  return (
    <div className="composer">
      <header className="composer__header">
        <span className="composer__workspace-chip" title="Active workspace">
          <Building2 size={12} aria-hidden="true" />
          {workspaceLabel}
        </span>
        {roleLabel && (
          <span className="composer__role-chip">{roleLabel}</span>
        )}
        <div className="composer__header-text">
          <h1 className="composer__title">{isEditing ? 'Edit Post' : 'New Post'}</h1>
          <p className="composer__subtitle">
            Compose once across channels — organization, workspace, and team access stay in sync.
          </p>
        </div>
        <div className="composer__header-actions">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            className="composer-preview-toggle"
            onClick={() => setShowPreviewPanel(true)}
            aria-controls="composer-preview"
          >
            Preview
          </Button>
        </div>
      </header>

      <ComposerTenantBar tenant={tenant} />

      <div className="composer__body">
        {/* Left workspace rail — desktop */}
        <div className="composer__left">
          <ComposerWorkspaceRail tenant={tenant} />
          <ComposerConnectChannels {...connectProps} />
        </div>

        {/* Center editor */}
        <div className="composer__center">
          <div className="composer__form-scroll">
            <div className="composer__stack">
              {/* Mobile / tablet: tenant + connect */}
              <div className="composer__connect-mobile">
                <ComposerWorkspaceRail tenant={tenant} compact />
                <ComposerConnectChannels {...connectProps} compact />
              </div>

              <TPanel
                title="Publish to"
                subtitle="Select connected channels for this post"
              >
                <ComposerPlatformPills
                  selected={targetPlatforms}
                  onToggle={togglePlatform}
                />
              </TPanel>

              <div className="composer__caption">
                <input
                  className="composer__title-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Internal title (optional)"
                  aria-label="Internal title"
                />
                <div className="composer__caption-toolbar">
                  <AIWriteButton
                    clientId={user?.client_id}
                    platform={targetPlatforms?.[0] || 'instagram'}
                    onInsert={(text) => setContent((c) => (c ? `${c}\n\n${text}` : text))}
                    size="sm"
                    align="right"
                  />
                </div>
                <textarea
                  className="composer__textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What do you want to say?"
                  rows={10}
                  aria-label="Post caption"
                />
                <div className="composer__media-row">
                  <TDropzone onFiles={onDropFiles} label="Add media" />
                  <ComposerMediaThumbs assets={mediaAssets} onRemove={removeAsset} />
                </div>
                <div className="composer__caption-footer">
                  <TCharBar
                    used={content.length}
                    max={primaryMax}
                    items={charItems}
                  />
                </div>
              </div>

              <TPanel title="First comment & tags" subtitle="Engagement + internal organization">
                <div className="composer__engage-stack">
                  <ComposerFirstComment
                    value={firstComment}
                    onChange={setFirstComment}
                    visible={showFirstComment}
                  />
                  <ComposerTags value={tags} onChange={setTags} />
                  <div className="composer-notes">
                    <div className="composer-notes__label-row">
                      <label className="composer-notes__label" htmlFor="composer-internal-notes">
                        <StickyNote size={14} aria-hidden="true" />
                        Internal notes
                      </label>
                      <span className="composer-badge">Internal team only</span>
                    </div>
                    <textarea
                      id="composer-internal-notes"
                      className="composer-notes__input"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Internal team notes — not visible to clients…"
                      rows={2}
                    />
                  </div>
                </div>
              </TPanel>

              <TPanel title="Media type" subtitle="How this post should be classified">
                <div className="composer__type-row" role="group" aria-label="Media type">
                  {MEDIA_TYPES.map((m) => (
                    <TPill
                      key={m.id}
                      selected={mediaType === m.id}
                      onClick={() => setMediaType(m.id)}
                    >
                      {m.label}
                    </TPill>
                  ))}
                </div>
              </TPanel>

              <TPanel title="When to post">
                <div className="composer__type-row" role="group" aria-label="Schedule mode">
                  {SCHEDULE_MODES.map((m) => (
                    <TPill
                      key={m.id}
                      selected={scheduleMode === m.id}
                      onClick={() => setScheduleMode(m.id)}
                    >
                      {m.id === 'now' && <Send size={12} strokeWidth={2.4} />}
                      {m.id === 'schedule' && <Calendar size={12} strokeWidth={2.4} />}
                      {m.id === 'queue' && <Clock size={12} strokeWidth={2.4} />}
                      {m.label}
                    </TPill>
                  ))}
                </div>
                {scheduleMode === 'schedule' && (
                  <>
                    <input
                      className="composer__datetime"
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      aria-label="Scheduled date and time"
                    />
                    <p className="composer__hint">
                      Local time. The scheduler runs every minute.
                    </p>
                  </>
                )}
                {scheduleMode === 'queue' && (
                  <p className="composer__hint">
                    Manage queues from the <strong>Queues</strong> page. Save as a draft,
                    then add it to a queue from there.
                  </p>
                )}
              </TPanel>

              <TPanel sunken title="AI assist">
                <div className="composer__ai-row">
                  <span className="composer__ai-label">Assist</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Wand2}
                    onClick={aiCompose}
                    loading={aiBusy}
                    disabled={targetPlatforms.length === 0}
                  >
                    Compose
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Hash}
                    onClick={aiHashtags}
                    loading={aiBusy}
                  >
                    Add hashtags
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Clock}
                    disabled
                    title="Best time to post — coming with audience analytics"
                  >
                    Best time
                  </Button>
                </div>
              </TPanel>

              {preflight && (
                <ComposerPreflight result={preflight} onClose={() => setPreflight(null)} />
              )}
            </div>
          </div>

          <TActionBar
            left={(
              <Button variant="secondary" icon={Save} onClick={onSaveDraft} loading={saving}>
                Save Draft
              </Button>
            )}
            right={(
              <>
                <Button variant="secondary" icon={Eye} onClick={onPreflight}>
                  Preflight
                </Button>
                {scheduleMode === 'schedule' ? (
                  <Button variant="primary" icon={Calendar} onClick={onSchedule} loading={saving}>
                    Schedule
                  </Button>
                ) : (
                  <Button variant="primary" icon={Send} onClick={onPublishNow} loading={saving}>
                    Publish Now
                  </Button>
                )}
              </>
            )}
          />
        </div>

        {showPreviewPanel && (
          <button
            type="button"
            className="composer__preview-backdrop"
            aria-label="Close preview"
            onClick={() => setShowPreviewPanel(false)}
          />
        )}

        <aside
          id="composer-preview"
          className={`composer__preview ${showPreviewPanel ? 'is-open' : ''}`}
          aria-label="Live preview"
        >
          <div className="composer__preview-header">
            <strong className="composer__preview-heading">Live preview</strong>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreviewPanel(false)}
              aria-label="Close preview panel"
            >
              Close
            </Button>
          </div>
          <div className="composer__preview-tabs" role="tablist" aria-label="Preview platform">
            {(targetPlatforms.length ? targetPlatforms : ['facebook']).map((pid) => {
              const p = PLATFORMS.find((x) => x.id === pid) || PLATFORMS[0];
              const active = pid === activePreview;
              return (
                <button
                  key={pid}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`composer__preview-tab composer__preview-tab--${pid} ${active ? 'is-active' : ''}`}
                  onClick={() => setActivePreview(pid)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="composer__preview-body">
            <ComposerPreviewCard
              platform={activePreview}
              content={content}
              mediaAssets={mediaAssets}
              mediaType={mediaType}
              user={user}
              firstComment={showFirstComment ? firstComment : ''}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
