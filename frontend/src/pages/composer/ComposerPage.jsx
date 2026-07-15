/* ============================================================================
 * Social Stats — Social Media Management & Marketing Platform
 * Author    : Chandrabhan Shekhawat
 * Company   : Gigai Kripa Services
 * Website   : https://gigaikripaservices.com/
 * Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 * Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Wand2, Hash, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import {
  ComposerPlatformPills,
  ComposerConnectChannels,
  ComposerFirstComment,
  ComposerTags,
  ComposerHeader,
  ComposerCaptionEditor,
  ComposerScheduleCard,
  ComposerActionFooter,
  ComposerPreviewPanel,
  ComposerPreflight,
  PLATFORMS,
  toLocalInput,
  scheduleFromQuery,
  supportsFirstComment,
} from '../../components/composer';
import { composerAPI, captionAPI, hashtagAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import useWorkspace from '../../hooks/useWorkspace';
import { useComposerPost } from '../../hooks/useComposer';

import '../../styles/scss/composer.scss';

export default function ComposerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isEditing = !!id;
  const { data: existing, loading: loadingExisting } = useComposerPost(id);
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const isAdminShell = location.pathname.startsWith('/admin');
  const mediaLibraryPath = `${basePath}/analytics/media`;

  const { workspaceId } = useWorkspace({ user, autoHydrate: false });

  const settingsPath = useMemo(() => {
    if (isAdminShell && workspaceId) return `/admin/client/${workspaceId}/settings`;
    return `${basePath}/settings`;
  }, [isAdminShell, workspaceId, basePath]);

  const clientParams = useMemo(
    () => (workspaceId ? { client_id: workspaceId } : undefined),
    [workspaceId],
  );

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
  const saveDraftRef = useRef(() => {});

  useEffect(() => {
    if (isEditing) return;
    const fromQuery = scheduleFromQuery(searchParams);
    if (fromQuery) {
      setScheduleMode('schedule');
      setScheduledAt(fromQuery);
    }
  }, [searchParams, isEditing]);

  useEffect(() => {
    if (!(existing && isEditing)) return;
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
  }, [existing, isEditing]);

  /* Global top-bar switch remounts routes; also clear local media if id changes mid-page */
  useEffect(() => {
    setMediaAssets([]);
    setPreflight(null);
  }, [workspaceId]);

  useEffect(() => {
    if (!targetPlatforms.includes(activePreview) && targetPlatforms[0]) {
      setActivePreview(targetPlatforms[0]);
    }
  }, [targetPlatforms, activePreview]);

  const primaryMax = useMemo(() => {
    const first = PLATFORMS.find((p) => targetPlatforms.includes(p.id)) || PLATFORMS[0];
    return first.maxText;
  }, [targetPlatforms]);

  const showFirstComment = supportsFirstComment(targetPlatforms);

  function togglePlatform(pid) {
    setTargetPlatforms((cur) => (cur.includes(pid)
      ? cur.filter((x) => x !== pid)
      : [...cur, pid]));
  }

  async function uploadFile(file) {
    if (!workspaceId) {
      toast.error('Select a workspace first');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await composerAPI.media.upload(fd, { client_id: workspaceId });
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
    const payload = {
      title: title.trim(),
      content,
      first_comment: firstComment,
      tags,
      internal_notes: internalNotes,
      media_type: mediaType,
      target_platforms: targetPlatforms,
      media_urls: mediaAssets.map((a) => `asset:${a.id}`),
    };
    if (workspaceId) {
      payload.client = workspaceId;
      payload.client_id = workspaceId;
    }
    return payload;
  }

  async function ensurePost() {
    if (!workspaceId) {
      throw new Error('No workspace selected');
    }
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
      toast.error(e.response?.data?.detail || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  saveDraftRef.current = onSaveDraft;

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveDraftRef.current();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      await composerAPI.posts.schedule(
        post.id,
        new Date(scheduledAt).toISOString(),
        clientParams,
      );
      toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Schedule failed');
    } finally {
      setSaving(false);
    }
  }

  async function onPublishNow() {
    if (!validate()) return;
    setSaving(true);
    try {
      const post = await ensurePost();
      const res = await composerAPI.posts.publishNow(post.id, clientParams);
      if (res.data?.status === 'pending_approval') toast.success('Sent for approval');
      else toast.success('Publishing — check status in a few seconds');
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  function validate() {
    if (!workspaceId) {
      toast.error('Select a workspace first'); return false;
    }
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
        client_id: workspaceId,
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
        client_id: workspaceId,
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

  const connectProps = {
    clientId: workspaceId,
    settingsPath,
    selectedPlatforms: targetPlatforms,
    onTogglePlatform: togglePlatform,
  };

  return (
    <div className="composer">
      <ComposerHeader
        title={isEditing ? 'Edit' : 'Create'}
        previewCount={targetPlatforms.length}
        onBack={() => navigate(-1)}
        onPreview={() => setShowPreviewPanel(true)}
      />

      <div className="composer__body">
        <div className="composer__center">
          <div className="composer__form-scroll">
            <div className="composer__stack">
              <section className="composer__section composer__animate" aria-label="Connected channels">
                <ComposerConnectChannels {...connectProps} compact />
              </section>

              <section className="composer__section composer__animate" aria-label="Publish to platforms">
                <ComposerPlatformPills
                  selected={targetPlatforms}
                  onToggle={togglePlatform}
                />
              </section>

              <section className="composer__section composer__animate composer__animate--d1">
                <div className="composer__section-head">
                  <label className="composer__section-label" htmlFor="composer-post-title">
                    Title
                  </label>
                  <span className="composer__title-count">
                    {title.length}
                    {' / 255'}
                  </span>
                </div>
                <input
                  id="composer-post-title"
                  className="composer__standalone-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title…"
                  maxLength={255}
                />
              </section>

              <ComposerCaptionEditor
                content={content}
                onContentChange={setContent}
                mediaAssets={mediaAssets}
                onDropFiles={onDropFiles}
                onRemoveAsset={removeAsset}
                clientId={workspaceId}
                platform={targetPlatforms?.[0] || 'instagram'}
                onInsertAi={(text) => setContent((c) => (c ? `${c}\n\n${text}` : text))}
                charUsed={content.length}
                charMax={primaryMax}
                mediaLibraryPath={mediaLibraryPath}
              />

              <ComposerFirstComment
                value={firstComment}
                onChange={setFirstComment}
                visible={showFirstComment}
              />

              <hr className="composer__divider" />

              <ComposerTags value={tags} onChange={setTags} clientId={workspaceId} />

              <div className="composer-notes">
                <div className="composer-notes__label-row">
                  <label className="composer__section-label" htmlFor="composer-internal-notes">
                    Notes
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

              <ComposerScheduleCard
                mediaType={mediaType}
                onMediaType={setMediaType}
                scheduleMode={scheduleMode}
                onScheduleMode={setScheduleMode}
                scheduledAt={scheduledAt}
                onScheduledAt={setScheduledAt}
              />

              <section className="composer__section composer__section--assist composer__animate composer__animate--d3">
                <h2 className="composer__section-label">AI assist</h2>
                <div className="composer__ai-row">
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
              </section>

              {preflight && (
                <ComposerPreflight result={preflight} onClose={() => setPreflight(null)} />
              )}
            </div>
          </div>

          <ComposerActionFooter
            saving={saving}
            scheduleMode={scheduleMode}
            onSaveDraft={onSaveDraft}
            onPreflight={onPreflight}
            onSchedule={onSchedule}
            onPublishNow={onPublishNow}
          />
        </div>

        <ComposerPreviewPanel
          open={showPreviewPanel}
          onClose={() => setShowPreviewPanel(false)}
          platforms={targetPlatforms}
          activePreview={activePreview}
          onSelectPreview={setActivePreview}
          content={content}
          mediaAssets={mediaAssets}
          mediaType={mediaType}
          user={user}
          firstComment={showFirstComment ? firstComment : ''}
        />
      </div>
    </div>
  );
}
