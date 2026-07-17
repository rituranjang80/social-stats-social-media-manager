import PropTypes from 'prop-types';
import { YT_PRIVACY_OPTIONS } from './constants';

/**
 * YouTube visibility: public / unlisted / private / schedule (+ optional premiere).
 */
export default function VisibilitySelector({
  privacy,
  onPrivacyChange,
  scheduleAt,
  onScheduleAtChange,
  isPremiere,
  onPremiereChange,
  error,
  scheduleError,
}) {
  return (
    <div className="yt-settings__field-group">
      <label className="yt-settings__label" htmlFor="yt-privacy">
        Visibility
      </label>
      <select
        id="yt-privacy"
        className={`yt-settings__select${error ? ' is-invalid' : ''}`}
        value={privacy || 'public'}
        onChange={(e) => onPrivacyChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? 'yt-privacy-err' : undefined}
      >
        {YT_PRIVACY_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      {error ? <p id="yt-privacy-err" className="yt-settings__error" role="alert">{error}</p> : null}
      <p className="yt-settings__hint">
        {YT_PRIVACY_OPTIONS.find((o) => o.id === privacy)?.hint}
      </p>

      {privacy === 'scheduled' ? (
        <div className="yt-settings__field">
          <label className="yt-settings__label" htmlFor="yt-schedule-at">
            Publish at
          </label>
          <input
            id="yt-schedule-at"
            type="datetime-local"
            className={`yt-settings__input${scheduleError ? ' is-invalid' : ''}`}
            value={scheduleAt || ''}
            onChange={(e) => onScheduleAtChange(e.target.value)}
            aria-invalid={!!scheduleError}
          />
          {scheduleError ? (
            <p className="yt-settings__error" role="alert">{scheduleError}</p>
          ) : null}
        </div>
      ) : null}

      <label className="yt-settings__check">
        <input
          type="checkbox"
          checked={!!isPremiere}
          onChange={(e) => onPremiereChange(e.target.checked)}
        />
        <span>
          Premiere
          <span className="yt-settings__hint">Schedule a watch-party style premiere when supported</span>
        </span>
      </label>
    </div>
  );
}

VisibilitySelector.propTypes = {
  privacy: PropTypes.string,
  onPrivacyChange: PropTypes.func.isRequired,
  scheduleAt: PropTypes.string,
  onScheduleAtChange: PropTypes.func.isRequired,
  isPremiere: PropTypes.bool,
  onPremiereChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  scheduleError: PropTypes.string,
};
