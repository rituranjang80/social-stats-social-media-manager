import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';
import { statusLabelFor } from '../calendar/statusTheme';

export default function PostManagementStatusModal({
  open,
  post,
  nextStatus,
  saving,
  onCancel,
  onConfirm,
}) {
  const [comment, setComment] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open) {
      setComment('');
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [open, post?.id, nextStatus]);

  if (!open || !post) return null;

  const fromLabel = statusLabelFor(post.status);
  const toLabel = statusLabelFor(nextStatus);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;
    onConfirm?.(trimmed);
  };

  return (
    <div className="bb-pm-modal__backdrop" role="presentation" onClick={onCancel}>
      <div
        className="bb-pm-modal"
        role="dialog"
        aria-labelledby="bb-pm-status-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="bb-pm-status-modal-title" className="bb-pm-modal__title">
          Update post status
        </h2>
        <p className="bb-pm-modal__lead">
          Change status from <strong>{fromLabel}</strong> to <strong>{toLabel}</strong>.
          Add a note for your team (saved in the audit log).
        </p>
        <form onSubmit={handleSubmit}>
          <label className="bb-pm-modal__label" htmlFor="bb-pm-status-comment">
            Comment <span className="bb-pm-modal__req">*</span>
          </label>
          <textarea
            id="bb-pm-status-comment"
            ref={textareaRef}
            className="bb-pm-modal__textarea"
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Why are you changing status? (visible in status history)"
            disabled={saving}
          />
          <div className="bb-pm-modal__actions">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={!comment.trim() || saving}>
              Save status
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

PostManagementStatusModal.propTypes = {
  open: PropTypes.bool,
  post: PropTypes.object,
  nextStatus: PropTypes.string,
  saving: PropTypes.bool,
  onCancel: PropTypes.func,
  onConfirm: PropTypes.func,
};
