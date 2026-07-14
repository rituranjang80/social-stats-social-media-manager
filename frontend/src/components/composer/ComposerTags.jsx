/* ============================================================================
 * Internal Tags — workspace/team labels (not published hashtags).
 * ========================================================================== */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tag, X, ChevronDown, Plus } from 'lucide-react';
import { composerAPI } from '../../services/api';

export default function ComposerTags({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [allTags, setAllTags] = useState([]);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await composerAPI.posts.tagSuggestions();
        if (!cancelled) setAllTags(res.data?.tags || []);
      } catch {
        /* suggestions are optional */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = Array.from(new Set([...(allTags || []), ...value]));
    return pool
      .filter((t) => !q || t.toLowerCase().includes(q))
      .sort((a, b) => a.localeCompare(b));
  }, [allTags, value, search]);

  function toggleTag(name) {
    const n = name.trim();
    if (!n) return;
    if (value.includes(n)) onChange(value.filter((t) => t !== n));
    else onChange([...value, n]);
  }

  function createTag() {
    const n = search.trim().slice(0, 48);
    if (!n) return;
    if (!allTags.includes(n)) setAllTags((cur) => [...cur, n].sort((a, b) => a.localeCompare(b)));
    if (!value.includes(n)) onChange([...value, n]);
    setSearch('');
  }

  function removeAt(idx) {
    onChange(value.filter((_, i) => i !== idx));
  }

  const canCreate = search.trim()
    && !filtered.some((t) => t.toLowerCase() === search.trim().toLowerCase());

  return (
    <div className="composer-tags" ref={rootRef}>
      <div className="composer-tags__label-row">
        <span className="composer-tags__label">
          <Tag size={14} aria-hidden="true" />
          Tags
        </span>
        <span className="composer-badge">Internal team only</span>
      </div>

      <button
        type="button"
        className={`composer-tags__trigger ${open ? 'is-open' : ''}`}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="composer-tags__chips">
          {value.length === 0 && (
            <span className="composer-tags__placeholder">Select tags…</span>
          )}
          {value.map((tag, idx) => (
            <span key={tag} className="composer-tags__chip">
              {tag}
              <button
                type="button"
                className="composer-tags__chip-x"
                aria-label={`Remove tag ${tag}`}
                onClick={(e) => { e.stopPropagation(); removeAt(idx); }}
              >
                <X size={10} strokeWidth={3} />
              </button>
            </span>
          ))}
        </span>
        <ChevronDown size={16} className="composer-tags__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="composer-tags__dropdown" role="listbox" aria-label="Tag suggestions">
          <input
            ref={inputRef}
            className="composer-tags__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (canCreate) createTag();
                else if (filtered[0]) toggleTag(filtered[0]);
              }
            }}
            placeholder="Search or create…"
            aria-label="Search tags"
          />
          <ul className="composer-tags__options">
            {filtered.map((tag) => {
              const checked = value.includes(tag);
              return (
                <li key={tag}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    className={`composer-tags__option ${checked ? 'is-selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    <span className="composer-tags__check" aria-hidden="true">
                      {checked ? '✓' : ''}
                    </span>
                    {tag}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && !canCreate && (
              <li className="composer-tags__empty">No tags yet. Type to create one.</li>
            )}
            {canCreate && (
              <li>
                <button
                  type="button"
                  className="composer-tags__option composer-tags__option--create"
                  onClick={createTag}
                >
                  <Plus size={14} aria-hidden="true" />
                  Create “{search.trim()}”
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
