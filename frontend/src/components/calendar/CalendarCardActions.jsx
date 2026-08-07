import PropTypes from 'prop-types';
import {
  Copy, Eye, BarChart2, Pencil, Trash2, ExternalLink,
} from 'lucide-react';
import { postStatusFilterKey } from './statusTheme';

/**
 * Post action toolbar (shown on card hover or in the fixed pinned dock).
 */
export default function CalendarCardActions({
  post,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
  onAnalytics,
  onComposer,
  className = '',
  visible = false,
}) {
  const statusKey = postStatusFilterKey(post.status);
  const rootClass = [
    'bb-cal__card-actions',
    visible ? 'bb-cal__card-actions--visible' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass} role="toolbar" aria-label="Post actions">
      {onEdit ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="Edit"
          aria-label="Edit"
          onClick={(e) => { e.stopPropagation(); onEdit(post); }}
        >
          <Pencil size={12} />
        </button>
      ) : null}
      {onDuplicate ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="Duplicate"
          aria-label="Duplicate"
          onClick={(e) => { e.stopPropagation(); onDuplicate(post); }}
        >
          <Copy size={12} />
        </button>
      ) : null}
      {onPreview || onOpen ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="Preview"
          aria-label="Preview"
          onClick={(e) => { e.stopPropagation(); (onPreview || onOpen)(post); }}
        >
          <Eye size={12} />
        </button>
      ) : null}
      {onAnalytics ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="View analytics"
          aria-label="View analytics"
          onClick={(e) => { e.stopPropagation(); onAnalytics(post); }}
        >
          <BarChart2 size={12} />
        </button>
      ) : null}
      {onComposer ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="Open Composer"
          aria-label="Open Composer"
          onClick={(e) => { e.stopPropagation(); onComposer(post); }}
        >
          <ExternalLink size={12} />
        </button>
      ) : null}
      {onDelete && statusKey !== 'published' ? (
        <button
          type="button"
          className="bb-cal__card-action"
          title="Delete"
          aria-label="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(post); }}
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

CalendarCardActions.propTypes = {
  post: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onDuplicate: PropTypes.func,
  onPreview: PropTypes.func,
  onAnalytics: PropTypes.func,
  onComposer: PropTypes.func,
  className: PropTypes.string,
  visible: PropTypes.bool,
};
