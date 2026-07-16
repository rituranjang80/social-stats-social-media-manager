/* ============================================================================
 * Schedule + media-type selectors (presentation wrapper).
 * Nested under a TCard on ComposerPage — keep sub-labels, no outer chrome.
 * ========================================================================== */
import { Calendar, Send, Clock } from 'lucide-react';
import { TPill } from '../t';
import { MEDIA_TYPES, SCHEDULE_MODES } from './constants';

export default function ComposerScheduleCard({
  mediaType,
  onMediaType,
  scheduleMode,
  onScheduleMode,
  scheduledAt,
  onScheduledAt,
}) {
  return (
    <div className="composer-schedule">
      <div className="composer-schedule__block" aria-labelledby="composer-media-type-label">
        <h3 id="composer-media-type-label" className="composer__section-label">
          Media type
        </h3>
        <div className="composer__type-row" role="group" aria-label="Media type">
          {MEDIA_TYPES.map((m) => (
            <TPill
              key={m.id}
              selected={mediaType === m.id}
              onClick={() => onMediaType(m.id)}
            >
              {m.label}
            </TPill>
          ))}
        </div>
      </div>

      <div className="composer-schedule__block" aria-labelledby="composer-when-label">
        <h3 id="composer-when-label" className="composer__section-label">
          When to post
        </h3>
        <div className="composer__type-row" role="group" aria-label="Schedule mode">
          {SCHEDULE_MODES.map((m) => (
            <TPill
              key={m.id}
              selected={scheduleMode === m.id}
              onClick={() => onScheduleMode(m.id)}
            >
              {m.id === 'now' && <Send size={12} strokeWidth={2.4} />}
              {m.id === 'schedule' && <Calendar size={12} strokeWidth={2.4} />}
              {m.id === 'queue' && <Clock size={12} strokeWidth={2.4} />}
              {m.label}
            </TPill>
          ))}
        </div>
        {scheduleMode === 'schedule' && (
          <>
            <input
              className="composer__datetime"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => onScheduledAt(e.target.value)}
              aria-label="Scheduled date and time"
            />
            <p className="composer__hint">
              Local time. The scheduler runs every minute.
            </p>
          </>
        )}
        {scheduleMode === 'queue' && (
          <p className="composer__hint">
            Manage queues from the <strong>Queues</strong> page. Save as a draft,
            then add it to a queue from there.
          </p>
        )}
      </div>
    </div>
  );
}
