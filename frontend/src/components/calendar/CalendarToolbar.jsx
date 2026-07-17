import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Search,
} from 'lucide-react';
import { CAL_STATUS_OPTIONS, CAL_VIEWS } from './constants';
import ConnectedChannelFilter from './ConnectedChannelFilter';
import TagFilterDropdown from './TagFilterDropdown';
import { periodLabel } from './utils';

export default function CalendarToolbar({
  view,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  status,
  onStatusChange,
  channels,
  onChannelsChange,
  tags,
  onTagsChange,
  tagOptions,
  fallbackPlatforms,
  search,
  onSearchChange,
  clientId,
  workspaceLabel,
  currentUser,
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef(null);
  const viewBtnId = useId();

  useEffect(() => {
    if (!viewOpen) return undefined;
    function onDoc(e) {
      if (viewRef.current && !viewRef.current.contains(e.target)) setViewOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [viewOpen]);

  const viewLabel = CAL_VIEWS.find((v) => v.id === view)?.label || 'Month';

  return (
    <div className="bb-cal__toolbar" role="toolbar" aria-label="Calendar controls">
      <div className="bb-cal__nav">
        <button type="button" className="bb-cal__nav-btn" onClick={onPrev} aria-label="Previous">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="bb-cal__nav-btn" onClick={onNext} aria-label="Next">
          <ChevronRight size={16} />
        </button>
      </div>

      <h2 className="bb-cal__period">{periodLabel(view, currentDate)}</h2>

      <button type="button" className="bb-cal__today-btn" onClick={onToday}>
        Today
      </button>

      <div className="bb-cal__view-wrap" ref={viewRef}>
        <button
          id={viewBtnId}
          type="button"
          className="bb-cal__view-btn"
          aria-haspopup="menu"
          aria-expanded={viewOpen}
          onClick={() => setViewOpen((v) => !v)}
        >
          {viewLabel}
          <ChevronDown size={12} aria-hidden />
        </button>
        {viewOpen ? (
          <div className="bb-cal__view-menu" role="menu" aria-labelledby={viewBtnId}>
            {CAL_VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="menuitem"
                className={`bb-cal__view-option${view === v.id ? ' is-active' : ''}`}
                onClick={() => {
                  onViewChange(v.id);
                  setViewOpen(false);
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="bb-cal__filters">
        <div className="bb-cal__filter">
          <ClipboardList className="bb-cal__filter-icon" aria-hidden />
          <select
            className="bb-cal__select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Status filter"
          >
            {CAL_STATUS_OPTIONS.map((o) => (
              <option key={o.id || 'all'} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <ConnectedChannelFilter
          clientId={clientId}
          workspaceLabel={workspaceLabel}
          currentUser={currentUser}
          selected={channels}
          onChange={onChannelsChange}
          fallbackPlatforms={fallbackPlatforms}
        />
        <TagFilterDropdown
          clientId={clientId}
          selected={tags}
          onChange={onTagsChange}
          extraOptions={tagOptions}
        />

        <div className="bb-cal__filter">
          <Search className="bb-cal__filter-icon" aria-hidden />
          <input
            type="search"
            className="bb-cal__search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search…"
            aria-label="Search posts"
          />
        </div>
      </div>
    </div>
  );
}

CalendarToolbar.propTypes = {
  view: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
  currentDate: PropTypes.instanceOf(Date).isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onToday: PropTypes.func.isRequired,
  status: PropTypes.string,
  onStatusChange: PropTypes.func.isRequired,
  channels: PropTypes.arrayOf(PropTypes.string),
  onChannelsChange: PropTypes.func.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string),
  onTagsChange: PropTypes.func.isRequired,
  tagOptions: PropTypes.arrayOf(PropTypes.string),
  fallbackPlatforms: PropTypes.arrayOf(PropTypes.string),
  search: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  clientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  workspaceLabel: PropTypes.string,
  currentUser: PropTypes.object,
};
