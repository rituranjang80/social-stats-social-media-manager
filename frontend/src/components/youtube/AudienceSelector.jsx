import PropTypes from 'prop-types';

/**
 * Made for Kids / Not made for kids + age restriction.
 */
export default function AudienceSelector({
  madeForKids,
  onMadeForKidsChange,
  ageRestriction,
  onAgeRestrictionChange,
  error,
}) {
  return (
    <div className="yt-settings__field-group" role="group" aria-labelledby="yt-audience-label">
      <span id="yt-audience-label" className="yt-settings__label">Audience</span>
      <div className="yt-settings__radio-row">
        <label className="yt-settings__check">
          <input
            type="radio"
            name="yt-made-for-kids"
            checked={madeForKids === true}
            onChange={() => onMadeForKidsChange(true)}
          />
          <span>Made for kids</span>
        </label>
        <label className="yt-settings__check">
          <input
            type="radio"
            name="yt-made-for-kids"
            checked={madeForKids === false}
            onChange={() => onMadeForKidsChange(false)}
          />
          <span>Not made for kids</span>
        </label>
      </div>
      {error ? <p className="yt-settings__error" role="alert">{error}</p> : null}
      <p className="yt-settings__hint">
        Required by COPPA — mark if this video is directed at children under 13.
      </p>

      <label className="yt-settings__check">
        <input
          type="checkbox"
          checked={!!ageRestriction}
          onChange={(e) => onAgeRestrictionChange(e.target.checked)}
          disabled={madeForKids === true}
        />
        <span>
          Age restriction (18+)
          <span className="yt-settings__hint">Not available when Made for Kids is selected</span>
        </span>
      </label>
    </div>
  );
}

AudienceSelector.propTypes = {
  madeForKids: PropTypes.oneOf([true, false, null]),
  onMadeForKidsChange: PropTypes.func.isRequired,
  ageRestriction: PropTypes.bool,
  onAgeRestrictionChange: PropTypes.func.isRequired,
  error: PropTypes.string,
};
