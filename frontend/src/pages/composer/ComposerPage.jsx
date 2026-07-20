/* ============================================================================
 * Social Stats — Social Media Management & Marketing Platform
 * Author    : Chandrabhan Shekhawat
 * Company   : Gigai Kripa Services
 * Website   : https://gigaikripaservices.com/
 * Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 * Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  Clock,
  Hash,
  Loader2,
  PenLine,
  PlugZap,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../../components/ui/Button';
import { TCard, TInput, TTextArea } from '../../components/t';
import { ChannelSelector } from '../../components/channels';
import {
  ComposerFirstComment,
  ComposerTags,
  ComposerHeader,
  ComposerLoadingState,
  ComposerCaptionEditor,
  ComposerScheduleCard,
  ComposerActionFooter,
  ComposerPreviewPanel,
  ComposerPreflight,
  ComposerSection,
  PLATFORMS,
  toLocalInput,
  scheduleFromQuery,
  supportsFirstComment,
} from '../../components/composer';
import {
  createDefaultYoutubeSettings,
  normalizeYoutubeSettings,
  validateYoutubeSettings,
} from '../../components/youtube';
import { normalizeMediaAsset } from '../../components/media';
import { composerAPI, captionAPI, hashtagAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import useWorkspace from '../../hooks/useWorkspace';
import { useComposerPost } from '../../hooks/useComposer';
import { readComposerPreviewExpanded } from '../../components/composer/ComposerPreviewPanel';

import '../../styles/scss/composer.scss';

const MediaPickerModal = lazy(() => import('../../components/media/MediaPickerModal'));
const YoutubeSettingsPanel = lazy(() =>
  import('../../components/youtube/YoutubeSettingsPanel'),
);
const ThumbnailDialog = lazy(() =>
  import('../../components/thumbnail/ThumbnailDialog'),
);

export default function ComposerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isEditing = !!id;
  const { data: existing, loading: loadingExisting } = useComposerPost(id);
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';

  const { workspaceId, workspace, workspaces, switchWorkspace } = useWorkspace({ user, autoHydrate: true });

  const clientParams = useMemo(
    () => (workspaceId ? { client_id: workspaceId } : undefined),
    [workspaceId],
  );

  /* Calendar FAB / deep-link may pass workspace|client_id */
  useEffect(() => {
    const raw = searchParams.get('workspace') || searchParams.get('client_id');
    if (!raw || !workspaces?.length) return;
    const match = workspaces.find((w) => String(w.id) === String(raw));
    if (match && String(match.id) !== String(workspaceId)) {
      switchWorkspace(match);
    }
  }, [searchParams, workspaces, workspaceId, switchWorkspace]);

  /* ── Editor state ───────────────────────────────────────────────────── */
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [firstComment, setFirstComment] = useState('');
  const [tags, setTags] = useState([]);
  const [internalNotes, setInternalNotes] = useState('');
  const [mediaType, setMediaType] = useState('text');
  const [mediaAssets, setMediaAssets] = useState([]);
  const [targetPlatforms, setTargetPlatforms] = useState([]);
  const [scheduleMode, setScheduleMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [lastScheduledAt, setLastScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [composerStatus, setComposerStatus] = useState('Draft');
  const [formError, setFormError] = useState('');
  const [preflight, setPreflight] = useState(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [activePreview, setActivePreview] = useState('');
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(readComposerPreviewExpanded);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [replaceAssetIndex, setReplaceAssetIndex] = useState(null);
  const [youtubeSettings, setYoutubeSettings] = useState(createDefaultYoutubeSettings);
  const [youtubeErrors, setYoutubeErrors] = useState({});
  const [thumbnailOpen, setThumbnailOpen] = useState(false);
  const saveDraftRef = useRef(() => {});

  const showYoutubeSettings = targetPlatforms.includes('youtube');
  const primaryVideoAsset = useMemo(
    () => mediaAssets.find((a) => (a.mime_type || '').startsWith('video/')) || null,
    [mediaAssets],
  );

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
    if (Array.isArray(existing.media_assets) && existing.media_assets.length) {
      setMediaAssets(existing.media_assets.map(normalizeMediaAsset).filter(Boolean));
    } else {
      setMediaAssets([]);
    }
    if (existing.scheduled_at) {
      setScheduleMode('schedule');
      setScheduledAt(toLocalInput(existing.scheduled_at));
    }
    if (existing.status) {
      setComposerStatus(
        `${existing.status.charAt(0).toUpperCase()}${existing.status.slice(1)}`,
      );
    }
    const ytRaw = existing.platform_overrides?.youtube;
    setYoutubeSettings(normalizeYoutubeSettings(ytRaw));
    setYoutubeErrors({});
  }, [existing, isEditing]);

  /* Global top-bar switch remounts routes; also clear local media if id changes mid-page */
  useEffect(() => {
    setMediaAssets([]);
    setPreflight(null);
    setLastScheduledAt('');
    setComposerStatus('Draft');
    setFormError('');
    setYoutubeSettings(createDefaultYoutubeSettings());
    setYoutubeErrors({});
  }, [workspaceId]);

  useEffect(() => {
    if (!targetPlatforms.includes(activePreview)) {
      setActivePreview(targetPlatforms[0] || '');
    }
  }, [targetPlatforms, activePreview]);

  const primaryMax = useMemo(() => {
    const first = PLATFORMS.find((p) => targetPlatforms.includes(p.id));
    return first?.maxText ?? null;
  }, [targetPlatforms]);

  const characterLimits = useMemo(
    () => targetPlatforms
      .map((idValue) => PLATFORMS.find((platform) => platform.id === idValue))
      .filter(Boolean)
      .map((platform) => ({
        id: platform.id,
        label: platform.label,
        used: content.length,
        max: platform.maxText,
        over: content.length > platform.maxText,
      })),
    [content.length, targetPlatforms],
  );

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
    setUploadingCount((count) => count + 1);
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
    } finally {
      setUploadingCount((count) => Math.max(0, count - 1));
    }
  }

  function onDropFiles(files) {
    files.forEach((f) => uploadFile(f));
  }

  function removeAsset(idx) {
    setMediaAssets((cur) => cur.filter((_, i) => i !== idx));
  }

  function applyMediaTypeFromCount(count, mimeHint) {
    if (count <= 0) {
      setMediaType('text');
      return;
    }
    if (count === 1) {
      if ((mimeHint || '').startsWith('video/')) setMediaType('video');
      else setMediaType('image');
      return;
    }
    setMediaType('carousel');
  }

  function addLibraryAssets(picked) {
    const incoming = (picked || []).map(normalizeMediaAsset).filter(Boolean);
    if (!incoming.length) return;
    if (replaceAssetIndex != null) {
      setMediaAssets((current) => current.map(
        (asset, index) => (index === replaceAssetIndex ? incoming[0] : asset),
      ));
      setReplaceAssetIndex(null);
      toast.success('Media replaced');
      return;
    }
    setMediaAssets((cur) => {
      const have = new Set(cur.map((a) => String(a.id)));
      const added = incoming.filter((a) => !have.has(String(a.id)));
      if (!added.length) {
        toast('Already added');
        return cur;
      }
      const next = [...cur, ...added];
      applyMediaTypeFromCount(next.length, added[0]?.mime_type);
      toast.success(added.length === 1 ? 'Media added' : `${added.length} media items added`);
      return next;
    });
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
      media_assets: mediaAssets.map((a) => a.id),
      platform_overrides: {},
    };
    if (showYoutubeSettings) {
      payload.platform_overrides = {
        youtube: { ...youtubeSettings },
      };
    }
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
      setComposerStatus('Draft saved');
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
    if (!validate({ forPublish: true })) return;
    if (!scheduledAt) {
      setFormError('Pick a future date/time first');
      toast.error('Pick a future date/time first');
      return;
    }
    setSaving(true);
    try {
      const post = await ensurePost();
      await composerAPI.posts.schedule(
        post.id,
        new Date(scheduledAt).toISOString(),
        clientParams,
      );
      setLastScheduledAt(scheduledAt);
      setComposerStatus('Scheduled');
      toast.success(`Scheduled for ${new Date(scheduledAt).toLocaleString()}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Schedule failed');
    } finally {
      setSaving(false);
    }
  }

  async function onPublishNow() {
    if (!validate({ forPublish: true })) return;
    setSaving(true);
    try {
      const post = await ensurePost();
      const res = await composerAPI.posts.publishNow(post.id, clientParams);
      if (res.data?.status === 'pending_approval') {
        setComposerStatus('Pending approval');
        toast.success('Sent for approval');
      } else {
        setComposerStatus('Publishing');
        toast.success('Publishing — check status in a few seconds');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  }

  function validate({ forPublish = false } = {}) {
    setFormError('');
    const fail = (message) => {
      setFormError(message);
      toast.error(message);
      return false;
    };
    if (!workspaceId) {
      return fail('Select a workspace first');
    }
    if (mediaType === 'text' && !content.trim()) {
      return fail('Add some text first');
    }
    if (mediaType !== 'text' && mediaAssets.length === 0) {
      return fail('Upload at least one media file');
    }
    if (targetPlatforms.length === 0) {
      return fail('Pick at least one platform');
    }
    if (showYoutubeSettings) {
      if (forPublish && !['video', 'reel'].includes(mediaType)) {
        return fail('YouTube requires a video or reel');
      }
      const effectiveTitle = (youtubeSettings.title_override || title || '').trim();
      if (forPublish && !effectiveTitle) {
        setYoutubeErrors((e) => ({ ...e, title_override: 'Enter a video title' }));
        return fail('YouTube needs a video title');
      }
      const yt = validateYoutubeSettings(youtubeSettings, { forPublish });
      setYoutubeErrors(yt.errors);
      if (!yt.ok) {
        return fail(Object.values(yt.errors)[0] || 'Fix YouTube settings');
      }
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
    return <ComposerLoadingState />;
  }

  return (
    <div className={`composer${previewExpanded ? '' : ' is-preview-collapsed'}`}>
      <ComposerHeader
        title={isEditing ? 'Edit' : 'Create'}
        workspaceLabel={workspace?.company || workspace?.name || workspace?.label || ''}
        status={composerStatus}
        saving={saving}
        previewCount={targetPlatforms.length}
        onBack={() => navigate(-1)}
        onPreview={() => {
          setShowPreviewPanel(true);
          setPreviewExpanded(true);
        }}
      />

      <div className="composer__body">
        <div className="composer__center">
          <div className="composer__form-scroll">
            <div className="composer__stack composer__stack--t-cards">
              {formError ? (
                <div className="composer__form-error" role="alert">
                  <strong>Check this post</strong>
                  <span>{formError}</span>
                </div>
              ) : null}
              <ComposerSection
                title="Create content"
                description="Choose channels, write your post, and attach media."
                icon={PenLine}
                className="composer__animate"
              >
                <div className="composer__section-grid">
                  <TCard label="Connected channels" aria-label="Publish to platforms">
                    <ChannelSelector
                      clientId={workspaceId}
                      workspaceLabel={workspace?.company || workspace?.name || workspace?.label || ''}
                      currentUser={user}
                      selected={targetPlatforms}
                      onToggle={togglePlatform}
                      emptyAction={(
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={PlugZap}
                          onClick={() => navigate(`${basePath}/settings`)}
                        >
                          Connect accounts
                        </Button>
                      )}
                    />
                  </TCard>

                  <TCard
                    label="Post title"
                    meta={(
                      <span className="composer__title-count" aria-live="polite">
                        {title.length}
                        {' / 255'}
                      </span>
                    )}
                  >
                    <TInput
                      id="composer-post-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give this post a clear internal title…"
                      maxLength={255}
                      aria-label="Post title"
                    />
                  </TCard>

                  <ComposerCaptionEditor
                    content={content}
                    onContentChange={setContent}
                    mediaAssets={mediaAssets}
                    onDropFiles={onDropFiles}
                    onRemoveAsset={removeAsset}
                    onReplaceAsset={(index) => {
                      setReplaceAssetIndex(index);
                      setMediaPickerOpen(true);
                    }}
                    clientId={workspaceId}
                    platform={targetPlatforms?.[0] || 'instagram'}
                    onInsertAi={(text) => setContent((c) => (c ? `${c}\n\n${text}` : text))}
                    charUsed={content.length}
                    charMax={primaryMax}
                    charLimits={characterLimits}
                    uploading={uploadingCount > 0}
                    onOpenMediaLibrary={() => setMediaPickerOpen(true)}
                    gridSpan={showFirstComment ? 8 : 12}
                  />

                  <ComposerFirstComment
                    value={firstComment}
                    onChange={setFirstComment}
                    visible={showFirstComment}
                    gridSpan={4}
                  />
                </div>
              </ComposerSection>

              <ComposerSection
                title="Publishing"
                description="Choose when to publish and review platform-specific settings."
                icon={CalendarClock}
              >
                <div className="composer__section-grid">
                  <TCard label="Schedule">
                    <ComposerScheduleCard
                      mediaType={mediaType}
                      onMediaType={setMediaType}
                      scheduleMode={scheduleMode}
                      onScheduleMode={setScheduleMode}
                      scheduledAt={scheduledAt}
                      onScheduledAt={setScheduledAt}
                      scheduledSuccess={lastScheduledAt}
                      onOpenCalendar={() => navigate(`${basePath}/analytics/calendar`)}
                      onOpenQueues={() => navigate(`${basePath}/analytics/queues`)}
                    />
                  </TCard>

                  {showYoutubeSettings ? (
                    <TCard label="YouTube" aria-label="YouTube Settings">
                      <Suspense
                        fallback={(
                          <div className="composer__loading">
                            <Loader2 size={16} className="composer__spin" />
                            Loading YouTube settings…
                          </div>
                        )}
                      >
                        <YoutubeSettingsPanel
                          value={youtubeSettings}
                          onChange={(next) => {
                            setYoutubeSettings(next);
                            setYoutubeErrors({});
                          }}
                          errors={youtubeErrors}
                          onOpenThumbnail={() => {
                            if (!primaryVideoAsset) {
                              toast.error('Attach a video first to create a thumbnail');
                              return;
                            }
                            setThumbnailOpen(true);
                          }}
                        />
                      </Suspense>
                    </TCard>
                  ) : null}

                  {preflight ? (
                    <ComposerPreflight result={preflight} onClose={() => setPreflight(null)} />
                  ) : (
                    <div className="composer__checklist" role="status">
                      <strong>Publishing checklist</strong>
                      <span>{targetPlatforms.length > 0 ? 'Channels selected' : 'Select at least one channel'}</span>
                      <span>{content.trim() || mediaAssets.length > 0 ? 'Content added' : 'Add text or media'}</span>
                      <span>Run Preflight before publishing for platform-specific checks</span>
                    </div>
                  )}
                </div>
              </ComposerSection>

              <ComposerSection
                title="Team details"
                description="Internal labels and notes are never published."
                icon={Users}
                collapsible
                defaultOpen={false}
              >
                <div className="composer__section-grid">
                  <TCard
                    label="Tags"
                    gridSpan={6}
                    meta={<span className="composer-badge">Internal team only</span>}
                  >
                    <ComposerTags
                      value={tags}
                      onChange={setTags}
                      clientId={workspaceId}
                      showLabel={false}
                    />
                  </TCard>

                  <TCard
                    label="Notes"
                    gridSpan={6}
                    meta={<span className="composer-badge">Internal team only</span>}
                  >
                    <TTextArea
                      id="composer-internal-notes"
                      size="sm"
                      rows={3}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Add context for teammates…"
                      aria-label="Internal team notes"
                    />
                  </TCard>
                </div>
              </ComposerSection>

              <ComposerSection
                title="Assist"
                description="Generate a starting point or add relevant hashtags."
                icon={Sparkles}
                collapsible
                defaultOpen={false}
              >
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
              </ComposerSection>
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
          desktopExpanded={previewExpanded}
          onDesktopExpandedChange={setPreviewExpanded}
          platforms={targetPlatforms}
          activePreview={activePreview}
          onSelectPreview={setActivePreview}
          content={content}
          mediaAssets={mediaAssets}
          mediaType={mediaType}
          user={user}
          firstComment={showFirstComment ? firstComment : ''}
        />

        {mediaPickerOpen ? (
          <Suspense fallback={null}>
            <MediaPickerModal
              open={mediaPickerOpen}
              onClose={() => {
                setMediaPickerOpen(false);
                setReplaceAssetIndex(null);
              }}
              multiple={replaceAssetIndex == null}
              title={replaceAssetIndex == null ? 'Media Library' : 'Replace media'}
              excludeIds={mediaAssets.map((a) => a.id)}
              onSelect={addLibraryAssets}
            />
          </Suspense>
        ) : null}

        {thumbnailOpen ? (
          <Suspense fallback={null}>
            <ThumbnailDialog
              open={thumbnailOpen}
              onClose={() => setThumbnailOpen(false)}
              videoAsset={primaryVideoAsset}
              clientId={workspaceId}
              onUseThumbnail={({ thumbnail_asset_id, thumbnail_url }) => {
                setYoutubeSettings((cur) => ({
                  ...cur,
                  thumbnail_asset_id,
                  thumbnail_url,
                }));
              }}
            />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
