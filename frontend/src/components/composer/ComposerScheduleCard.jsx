/* ============================================================================
 * Schedule + media-type selectors (presentation wrapper).
 * Nested under a TCard on ComposerPage — keep sub-labels, no outer chrome.
 * ========================================================================== */
import { useMemo } from 'react';
import { Calendar, Send, Clock, Globe2 } from 'lucide-react';
import { TPill } from '../t';
import { MEDIA_TYPES, SCHEDULE_MODES } from './constants';

export default function ComposerScheduleCard({
  mediaType,
  onMediaType,
  scheduleMode,
  onScheduleMode,
  scheduledAt,
  onScheduledAt,
  scheduledSuccess = '',
  onOpenCalendar,
  onOpenQueues,
}) {
  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time';
    } catch {
      return 'Local time';
    }
  }, []);

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
              aria-describedby="composer-schedule-timezone composer-schedule-hint"
            />
            <div id="composer-schedule-timezone" className="composer-schedule__timezone">
              <Globe2 size={13} aria-hidden="true" />
              <span>{timezone}</span>
            </div>
            <p id="composer-schedule-hint" className="composer__hint">
              The selected local time is converted securely for scheduling. The scheduler runs every minute.
            </p>
            {scheduledSuccess ? (
              <div className="composer-schedule__success" role="status">
                <span>Scheduled successfully.</span>
                {onOpenCalendar ? (
                  <button type="button" onClick={onOpenCalendar}>
                    Open calendar
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}
        {scheduleMode === 'queue' && (
          <div className="composer-schedule__queue-help">
            <p className="composer__hint">
              Save this post as a draft, then add it to an active recurring queue.
            </p>
            {onOpenQueues ? (
              <button type="button" onClick={onOpenQueues}>Manage queues</button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
