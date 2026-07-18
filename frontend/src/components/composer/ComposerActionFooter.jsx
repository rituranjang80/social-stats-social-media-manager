/* ============================================================================
 * Sticky composer footer — draft / preflight / publish|schedule.
 * ========================================================================== */
import { Calendar, Send, Save, Eye } from 'lucide-react';
import { TActionBar } from '../t';

export default function ComposerActionFooter({
  saving,
  scheduleMode,
  onSaveDraft,
  onPreflight,
  onSchedule,
  onPublishNow,
}) {
  return (
    <TActionBar
      className="composer__action-bar"
      ariaBusy={saving}
      ariaLabel="Composer actions"
      hint="Ctrl/Cmd + S to save"
      status={saving ? 'Saving your changes…' : 'Changes are saved manually'}
      left={(
        <button
          type="button"
          className="composer-btn composer-btn--ghost"
          onClick={onSaveDraft}
          disabled={saving}
        >
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          <span className="composer-btn__label">Save Draft</span>
        </button>
      )}
      right={(
        <div className="composer__publish-group">
          <button
            type="button"
            className="composer-btn composer-btn--secondary"
            onClick={onPreflight}
          disabled={saving}
          >
            <Eye size={16} strokeWidth={2} aria-hidden="true" />
            <span className="composer-btn__label">Preflight</span>
          </button>
          {scheduleMode === 'schedule' ? (
            <button
              type="button"
              className="composer-btn composer-btn--brand"
              onClick={onSchedule}
              disabled={saving}
            >
              <Calendar size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
          ) : (
            <button
              type="button"
              className="composer-btn composer-btn--brand"
              onClick={onPublishNow}
              disabled={saving}
            >
              <Send size={16} strokeWidth={2} aria-hidden="true" />
              {saving ? 'Publishing…' : 'Publish Now'}
            </button>
          )}
        </div>
      )}
    />
  );
}
