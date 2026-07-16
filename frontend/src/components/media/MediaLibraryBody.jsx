/* ============================================================================
 * MediaLibraryBody — shared grid (standalone page + composer picker).
 * Renders .media-library__body only (no page chrome).
 * ========================================================================== */
import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Image as ImageIcon, Upload, Search, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import { useMediaAssets } from '../../hooks/useComposer';
import { composerAPI } from '../../services/api';
import MediaAssetTile from './MediaAssetTile';
import { normalizeMediaAsset } from './mediaUtils';

import '../../styles/scss/media-library.scss';

/**
 * @param {'manage'|'picker'} mode
 * @param {'single'|'multiple'} selectionMode — picker only
 * @param {number[]} excludeIds — already attached (picker)
 * @param {(assets: object[]) => void} onConfirm — picker confirm / single pick
 * @param {(asset: object) => void} onOpenVideo — manage mode double-click video
 * @param {React.MutableRefObject} actionsRef — optional imperative { confirm, selectionCount }
 */
export default function MediaLibraryBody({
  mode = 'manage',
  selectionMode = 'multiple',
  excludeIds = [],
  onConfirm,
  onOpenVideo,
  onSelectionChange,
  showUpload = true,
  className = '',
}) {
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [mime, setMime] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const fileRef = useRef(null);
  const sentinelRef = useRef(null);

  const params = {};
  if (folder) params.folder = folder;
  if (mime) params.mime = mime;

  const {
    data: assets,
    refetch,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useMediaAssets(params, { paginate: true });

  const exclude = new Set((excludeIds || []).map(String));

  const filtered = !search
    ? assets
    : assets.filter((a) => (
      (a.alt_text || '').toLowerCase().includes(search.toLowerCase())
      || (a.filename || '').toLowerCase().includes(search.toLowerCase())
      || (a.tags || []).join(' ').toLowerCase().includes(search.toLowerCase())
    ));

  const folders = Array.from(new Set(assets.map((a) => a.folder).filter(Boolean))).sort();

  useEffect(() => {
    onSelectionChange?.(selected.size);
  }, [selected, onSelectionChange]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore?.();
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, filtered.length]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (!showUpload) return;
    const files = Array.from(e.dataTransfer.files || []);
    if (!files.length) return;
    (async () => {
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
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Upload failed');
      } finally {
        setUploading(false);
      }
    })();
  }, [folder, showUpload, refetch]);

  async function uploadFiles(files) {
    if (!files?.length || !showUpload) return;
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
  function toggle(asset) {
    const id = asset.id;
    if (exclude.has(String(id))) return;

    if (mode === 'picker' && selectionMode === 'single') {
      onConfirm?.([normalizeMediaAsset(asset)]);
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function activate(asset) {
    if (exclude.has(String(asset.id))) return;
    if (mode === 'picker') {
      onConfirm?.([normalizeMediaAsset(asset)]);
    }
  }

  function confirmSelected() {
    if (mode !== 'picker') return;
    const picked = assets
      .filter((a) => selected.has(a.id))
      .map(normalizeMediaAsset);
    if (!picked.length) {
      toast.error('Select at least one item');
      return;
    }
    onConfirm?.(picked);
  }

  async function bulkDelete() {
    if (mode !== 'manage' || !selected.size) return;
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

  const rootClass = [
    'media-library__body',
    mode === 'picker' ? 'media-library__body--picker' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {mode === 'manage' && showUpload ? (
        <div className="media-library__manage-actions">
          {selected.size > 0 && (
            <Button variant="secondary" onClick={bulkDelete}>
              Delete ({selected.size})
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,.gif,.pdf,.doc,.docx"
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
      ) : null}

      <Card padding="sm" className="media-library__toolbar">
        <div className="media-library__search">
          <Search size={14} className="media-library__search-icon" aria-hidden="true" />
          <input
            className="media-library__search-input"
            placeholder="Search alt text, filename, or tags…"
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
          <option value="application">Documents</option>
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
        {mode === 'picker' && selectionMode === 'multiple' ? (
          <Button
            variant="primary"
            size="sm"
            disabled={!selected.size}
            onClick={confirmSelected}
          >
            Add{selected.size ? ` (${selected.size})` : ''}
          </Button>
        ) : null}
      </Card>

      <div
        className={`media-library__dropzone${dragOver ? ' is-dragover' : ''}`}
        onDragOver={(e) => {
          if (!showUpload) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {loading && !assets.length ? (
          <div className="media-library__loading">
            <Loader2 size={18} className="media-library__spin" color="var(--text-tertiary)" />
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <Card padding="none" className="media-library__empty">
            <EmptyState
              icon={ImageIcon}
              title="No media yet"
              description={showUpload
                ? 'Drag-and-drop files here, or upload from the toolbar.'
                : 'Upload media from the Media Library page first.'}
              action={showUpload ? (
                <Button icon={Upload} onClick={() => fileRef.current?.click()}>Upload</Button>
              ) : null}
            />
          </Card>
        ) : null}

        {filtered.length > 0 ? (
          <div className="media-library__grid" role="list">
            {filtered.map((a) => {
              const disabled = exclude.has(String(a.id));
              return (
                <MediaAssetTile
                  key={a.id}
                  asset={a}
                  mode={mode}
                  selected={selected.has(a.id)}
                  disabled={disabled}
                  onToggle={toggle}
                  onActivate={activate}
                  onOpenVideo={onOpenVideo}
                />
              );
            })}
          </div>
        ) : null}

        <div ref={sentinelRef} className="media-library__sentinel" aria-hidden="true" />
        {loadingMore ? (
          <div className="media-library__loading media-library__loading--more">
            <Loader2 size={16} className="media-library__spin" color="var(--text-tertiary)" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
