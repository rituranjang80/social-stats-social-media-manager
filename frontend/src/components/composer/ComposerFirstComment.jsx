/* ============================================================================
 * First Comment — optional comment posted after publish (FB/IG/LI).
 * ========================================================================== */
import { MessageSquare } from 'lucide-react';

export default function ComposerFirstComment({ value, onChange, visible = true }) {
  if (!visible) return null;

  return (
    <div className="composer-first-comment">
      <div className="composer-first-comment__label-row">
        <label className="composer-first-comment__label" htmlFor="composer-first-comment">
          <MessageSquare size={14} aria-hidden="true" />
          First comment
        </label>
        <span className="composer-badge">Auto-posts after publish</span>
      </div>
      <textarea
        id="composer-first-comment"
        className="composer-first-comment__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="First comment posted after the main post…"
        rows={2}
        aria-describedby="composer-first-comment-hint"
      />
      <p id="composer-first-comment-hint" className="composer__hint">
        Supported on Facebook, Instagram, and LinkedIn when those channels are selected.
      </p>
    </div>
  );
}
