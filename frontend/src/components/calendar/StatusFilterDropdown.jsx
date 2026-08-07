import { useEffect, useId, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ClipboardList } from 'lucide-react';
import { getActiveStatusFilters } from './statusTheme';
import {
  isShowingAllStatuses,
  isStatusChecked,
  selectAllStatuses,
  toggleStatusCheck,
} from './statusFilterState';
import { multiSelectMasterProps, multiSelectRowProps } from './multiSelectFilterState';

/**
 * Searchable multi-select post status filter (same state as legend checkboxes).
 */
export default function StatusFilterDropdown({ selected = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const btnId = useId();

  const statusFilters = getActiveStatusFilters();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return statusFilters;
    return statusFilters.filter(
      (f) => f.label.toLowerCase().includes(needle) || f.id.includes(needle),
    );
  }, [q, statusFilters]);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const allOn = isShowingAllStatuses(selected);
  const masterProps = multiSelectMasterProps(allOn, () => onChange(selectAllStatuses()));

  const label = allOn
    ? 'All Posts'
    : `${selected.length} status${selected.length > 1 ? 'es' : ''}`;

  return (
    <div className="bb-cal__filter bb-cal-status-filter" ref={ref}>
      <ClipboardList className="bb-cal__filter-icon" aria-hidden />
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
        <div className="bb-cal__multi bb-cal-status-filter__panel" role="listbox" aria-labelledby={btnId}>
          <input
            className="bb-cal__multi-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search statuses…"
            aria-label="Search statuses"
          />
          <label className="bb-cal__multi-all" {...masterProps}>
            <input type="checkbox" readOnly tabIndex={-1} checked={allOn} />
            All Posts
          </label>
          {filtered.length === 0 ? (
            <p className="bb-cal__multi-item">No matches</p>
          ) : null}
          {filtered.map((f) => (
            <label
              key={f.id}
              className="bb-cal-status-filter__row"
              {...multiSelectRowProps(() => onChange(toggleStatusCheck(f.id, selected)))}
            >
              <input
                type="checkbox"
                readOnly
                tabIndex={-1}
                checked={isStatusChecked(f.id, selected)}
              />
              <span
                className={`bb-cal__legend-swatch bb-cal__legend-swatch--${f.id}`}
                aria-hidden
              />
              <span className={`bb-cal__legend-text bb-cal__legend-text--${f.id}`}>
                {f.label}
              </span>
            </label>
          ))}
          <div className="bb-cal__multi-actions">
            <button
              type="button"
              className="bb-cal__link-btn"
              onClick={() => onChange(filtered.map((f) => f.id))}
              disabled={!filtered.length}
            >
              Select visible
            </button>
            <button type="button" className="bb-cal__link-btn" onClick={() => onChange(selectAllStatuses())}>
              All Posts
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

StatusFilterDropdown.propTypes = {
  selected: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};
