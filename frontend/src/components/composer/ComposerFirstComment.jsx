/* ============================================================================
 * First Comment — optional comment posted after publish (FB/IG/LI).
 * ========================================================================== */
import { TCard, TTextArea } from '../t';

export default function ComposerFirstComment({
  value,
  onChange,
  visible = true,
  gridSpan = 4,
}) {
  if (!visible) return null;

  return (
    <TCard label="First comment" className="composer-first-comment" gridSpan={gridSpan}>
      <TTextArea
        id="composer-first-comment"
        size="sm"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="First comment posted after the main post…"
        aria-describedby="composer-first-comment-hint"
        hint="Supported on Facebook, Instagram, and LinkedIn when those channels are selected."
      />
      <span id="composer-first-comment-hint" className="sr-only">
        Supported on Facebook, Instagram, and LinkedIn when those channels are selected.
      </span>
    </TCard>
  );
}
