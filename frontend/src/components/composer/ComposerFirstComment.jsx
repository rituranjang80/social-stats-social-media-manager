/* ============================================================================
 * First Comment — optional comment posted after publish (FB/IG/LI).
 * ========================================================================== */

export default function ComposerFirstComment({ value, onChange, visible = true }) {
  if (!visible) return null;

  return (
    <div className="composer-first-comment">
      <label className="composer__section-label" htmlFor="composer-first-comment">
        First Comment
      </label>
      <textarea
        id="composer-first-comment"
        className="composer-first-comment__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="First comment posted after the main post…"
        rows={1}
        aria-describedby="composer-first-comment-hint"
      />
      <p id="composer-first-comment-hint" className="composer__hint">
        Supported on Facebook, Instagram, and LinkedIn when those channels are selected.
      </p>
    </div>
  );
}
