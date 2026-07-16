/* ============================================================================
 * Media Library — reusable photos, videos, and graphics.
 * Double-click a video to open it in Video Studio.
 * ========================================================================== */
import { useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon, Video, Trash2, Upload, Search, Loader2, Folder, Play,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { useMediaAssets } from '../../hooks/useComposer';
import { composerAPI } from '../../services/api';

import '../../styles/scss/media-library.scss';

export default function MediaLibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/dashboard';
  const videoStudioPath = `${basePath}/analytics/video`;

  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [mime, setMime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const fileRef = useRef();

  const params = {};
  if (folder) params.folder = folder;
  if (mime) params.mime = mime;
  const { data: assets, refetch, loading } = useMediaAssets(params);

  const filtered = !search ? assets
    : assets.filter((a) => (
      (a.alt_text || '').toLowerCase().includes(search.toLowerCase())
      || (a.tags || []).join(' ').toLowerCase().includes(search.toLowerCase())
    ));

  const folders = Array.from(new Set(assets.map((a) => a.folder).filter(Boolean))).sort();

  async function uploadFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of files) fd.append('files', f);
      if (folder) fd.append('folder', folder);
      const res = await composerAPI.media.bulkUpload(fd);
      const created = res.data?.created || [];
      const errors = res.data?.errors || [];
      if (created.length) toast.success(`Uploaded ${created.length} file${created.length === 1 ? '' : 's'}`);
      if (errors.length) toast.error(`${errors.length} file${errors.length === 1 ? '' : 's'} failed`);
      refetch();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(Array.from(e.dataTransfer.files || []));
  }, [folder]); // uploadFiles closes over folder for FormData

  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function openInVideoStudio(asset) {
    if (!(asset?.mime_type || '').startsWith('video/')) return;
    navigate(`${videoStudioPath}?asset_id=${encodeURIComponent(asset.id)}`);
  }

  async function bulkDelete() {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} item${selected.size === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all([...selected].map((id) => composerAPI.media.delete(id)));
      setSelected(new Set());
      refetch();
      toast.success('Deleted');
    } catch {
      toast.error('Delete failed');
    }
  }

  return (
    <div className="media-library">
      <PageHeader
        title="Media Library"
        subtitle="Reusable photos, videos, and graphics — double-click a video to edit in Video Studio"
        action={(
          <div className="media-library__actions">
            {selected.size > 0 && (
              <Button variant="secondary" icon={Trash2} onClick={bulkDelete}>
                Delete ({selected.size})
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                uploadFiles(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />
            <Button variant="primary" icon={Upload} onClick={() => fileRef.current?.click()} loading={uploading}>
              Upload
            </Button>
          </div>
        )}
      />

      <div className="media-library__body">
        <Card padding="sm" className="media-library__toolbar">
          <div className="media-library__search">
            <Search size={14} className="media-library__search-icon" aria-hidden="true" />
            <input
              className="media-library__search-input"
              placeholder="Search alt text or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search media"
            />
          </div>
          <select
            className="media-library__select"
            value={mime}
            onChange={(e) => setMime(e.target.value)}
            aria-label="Filter by type"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
          <select
            className="media-library__select"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Card>

        <div
          className={`media-library__dropzone${dragOver ? ' is-dragover' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {loading && (
            <div className="media-library__loading">
              <Loader2 size={18} className="media-library__spin" color="var(--text-tertiary)" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <Card padding="none" style={{ overflow: 'hidden' }}>
              <EmptyState
                icon={ImageIcon}
                title="No media yet"
                description="Drag-and-drop files anywhere on this page, or click Upload."
                action={<Button icon={Upload} onClick={() => fileRef.current?.click()}>Upload</Button>}
              />
            </Card>
          )}

          {!loading && filtered.length > 0 && (
            <div className="media-library__grid" role="list">
              {filtered.map((a) => (
                <AssetTile
                  key={a.id}
                  asset={a}
                  selected={selected.has(a.id)}
                  onToggle={() => toggle(a.id)}
                  onOpenVideo={() => openInVideoStudio(a)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetTile({ asset, selected, onToggle, onOpenVideo }) {
  const isVideo = (asset.mime_type || '').startsWith('video/');

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`media-asset-tile${selected ? ' is-selected' : ''}`}
      onClick={onToggle}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (isVideo) onOpenVideo();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && isVideo) {
          e.preventDefault();
          onOpenVideo();
          return;
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      title={isVideo ? 'Click to select · Double-click to open in Video Studio' : 'Click to select'}
      aria-pressed={selected}
      aria-label={`${isVideo ? 'Video' : 'Image'} ${asset.alt_text || asset.id}`}
    >
      <div className="media-asset-tile__preview">
        <AssetPreview asset={asset} isVideo={isVideo} />
        {isVideo ? (
          <span className="media-asset-tile__play" aria-hidden="true">
            <Play size={28} fill="currentColor" strokeWidth={0} />
          </span>
        ) : null}
        {isVideo && asset.duration_seconds ? (
          <span className="media-asset-tile__duration">
            {fmtDuration(asset.duration_seconds)}
          </span>
        ) : null}
      </div>
      <div className="media-asset-tile__meta">
        <div className="media-asset-tile__row">
          <span>{(asset.mime_type || '').split('/')[1] || '—'}</span>
          <span>{fmtBytes(asset.file_size)}</span>
        </div>
        {asset.folder ? (
          <div className="media-asset-tile__folder">
            <Folder size={10} aria-hidden="true" />
            {' '}
            {asset.folder}
          </div>
        ) : null}
        {isVideo ? (
          <div className="media-asset-tile__hint">Double-click → Video Studio</div>
        ) : null}
      </div>
    </div>
  );
}

/** Show real image / first video frame (not a generic icon) when possible. */
function AssetPreview({ asset, isVideo }) {
  const thumb = asset.thumbnail_url || '';
  const fileUrl = asset.file_url || '';

  if (thumb) {
    return (
      <img
        className="media-asset-tile__img"
        src={thumb}
        alt={asset.alt_text || ''}
        loading="lazy"
      />
    );
  }

  if (!isVideo && fileUrl) {
    return (
      <img
        className="media-asset-tile__img"
        src={fileUrl}
        alt={asset.alt_text || ''}
        loading="lazy"
      />
    );
  }

  if (isVideo && fileUrl) {
    return (
      <video
        className="media-asset-tile__video"
        src={fileUrl}
        muted
        playsInline
        preload="metadata"
        onLoadedData={(e) => {
          try {
            const el = e.currentTarget;
            if (el.currentTime < 0.05) el.currentTime = 0.1;
          } catch {
            /* seek may fail for some codecs — still shows first decoded frame */
          }
        }}
      />
    );
  }

  return isVideo
    ? <Video size={32} className="media-asset-tile__fallback" aria-hidden="true" />
    : <ImageIcon size={32} className="media-asset-tile__fallback" aria-hidden="true" />;
}

function fmtBytes(n) {
  if (!n) return '—';
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
