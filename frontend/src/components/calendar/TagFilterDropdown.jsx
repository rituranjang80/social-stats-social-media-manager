import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Hash } from 'lucide-react';
import { composerAPI } from '../../services/api';
import {
  clearMultiSelectAll,
  isMasterIndeterminate,
  isMultiSelectChecked,
  isMultiSelectNone,
  isShowingAllSelected,
  multiSelectMasterProps,
  multiSelectRowProps,
  selectNoneSelected,
  toggleMultiSelectItem,
} from './multiSelectFilterState';
import MultiSelectCheckbox from './MultiSelectCheckbox';

/** Deterministic pastel hue from tag name (no hardcoded palette list of names). */
function tagHue(name) {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

/**
 * Searchable multi-select tags from composer tag_suggestions + post-derived tags.
 * Empty selection = All Tags (no tag restriction).
 */
export default function TagFilterDropdown({
  clientId,
  selected = [],
  onChange,
  extraOptions = [],
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [apiTags, setApiTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const btnId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) {
        setApiTags([]);
        return;
      }
      setLoading(true);
      try {
        const res = await composerAPI.posts.tagSuggestions({ client_id: clientId });
        if (!cancelled) setApiTags(res.data?.tags || []);
      } catch {
        if (!cancelled) setApiTags([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const options = useMemo(() => {
    const set = new Set(
      [...(apiTags || []), ...(extraOptions || []), ...selected]
        .map((t) => String(t || '').replace(/^#/, '').trim())
        .filter(Boolean),
    );
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [apiTags, extraOptions, selected]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((t) => String(t).toLowerCase().includes(needle));
  }, [options, q]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function clearAll() {
    onChange(clearMultiSelectAll());
  }

  const allOn = isShowingAllSelected(selected, options);
  const indeterminate = isMasterIndeterminate(selected, options);
  const masterProps = multiSelectMasterProps(allOn, clearAll, () => onChange(selectNoneSelected()));
  const label = allOn
    ? 'All Tags'
    : (isMultiSelectNone(selected)
      ? 'No tags'
      : `${selected.length} tag${selected.length > 1 ? 's' : ''}`);

  return (
    <div className="bb-cal__filter bb-cal-tag-filter" ref={ref}>
      <Hash className="bb-cal__filter-icon" aria-hidden />
      <button
        id={btnId}
        type="button"
        className="bb-cal__select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div className="bb-cal__multi bb-cal-tag-filter__panel" role="listbox" aria-labelledby={btnId}>
          <input
            className="bb-cal__multi-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tags…"
            aria-label="Search tags"
          />
          <label className="bb-cal__multi-all" {...masterProps}>
            <MultiSelectCheckbox
              checked={allOn}
              indeterminate={indeterminate}
              ariaLabel="All Tags"
            />
            All Tags
          </label>
          {loading && !options.length ? (
            <p className="bb-cal__multi-item">Loading tags…</p>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="bb-cal__multi-item">No tags yet</p>
          ) : null}
          {filtered.map((tag) => {
            const bucket = Math.floor(tagHue(tag) / 30) % 12;
            return (
              <label
                key={tag}
                className="bb-cal-tag-filter__row"
                {...multiSelectRowProps(() => onChange(
                  toggleMultiSelectItem(tag, selected, options),
                ))}
              >
                <MultiSelectCheckbox
                  checked={isMultiSelectChecked(tag, selected, options)}
                  ariaLabel={`Tag ${tag}`}
                />
                <span
                  className="bb-cal-tag-filter__swatch"
                  data-bucket={bucket}
                  aria-hidden
                />
                <span>#{tag}</span>
              </label>
            );
          })}
          <div className="bb-cal__multi-actions">
            <button
              type="button"
              className="bb-cal__link-btn"
              onClick={() => onChange([...filtered])}
              disabled={!filtered.length}
            >
              Select visible
            </button>
            <button type="button" className="bb-cal__link-btn" onClick={clearAll}>
              All Tags
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

TagFilterDropdown.propTypes = {
  clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selected: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  extraOptions: PropTypes.arrayOf(PropTypes.string),
};
