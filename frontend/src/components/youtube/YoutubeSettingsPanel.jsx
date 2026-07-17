import { useCallback, useId, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronRight, ImagePlus, X } from 'lucide-react';
import VisibilitySelector from './VisibilitySelector';
import AudienceSelector from './AudienceSelector';
import {
  YT_CAPTION_CERT,
  YT_CATEGORIES,
  YT_COMMENT_MODERATION,
  YT_COMMENT_SORT,
  YT_DESCRIPTION_MAX,
  YT_LICENSE_OPTIONS,
  YT_SHORTS_REMIX,
  YT_TITLE_MAX,
  tagsFromInput,
  tagsToInput,
} from './constants';
import { validateYoutubeSettings } from './validation';

function Accordion({ id, title, open, onToggle, children }) {
  const panelId = `${id}-panel`;
  return (
    <div className={`yt-settings__accordion${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="yt-settings__accordion-trigger"
        id={`${id}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <ChevronRight size={14} className="yt-settings__accordion-icon" aria-hidden />
        {title}
      </button>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={`${id}-trigger`} className="yt-settings__accordion-body">
          {children}
        </div>
      ) : null}
    </div>
  );
}

Accordion.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  open: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node,
};

/**
 * Full YouTube Settings panel for Composer (shown when YouTube is selected).
 */
export default function YoutubeSettingsPanel({
  value,
  onChange,
  onOpenThumbnail,
  errors: externalErrors,
  validateOnChange = true,
}) {
  const baseId = useId();
  const [openSections, setOpenSections] = useState({
    basic: true,
    visibility: true,
    audience: false,
    license: false,
    distribution: false,
    comments: false,
    advanced: true,
    metadata: false,
  });

  const settings = value;
  const localValidation = useMemo(
    () => (validateOnChange ? validateYoutubeSettings(settings) : { errors: {} }),
    [settings, validateOnChange],
  );
  const errors = { ...localValidation.errors, ...(externalErrors || {}) };

  const patch = useCallback((partial) => {
    onChange({ ...settings, ...partial });
  }, [onChange, settings]);

  const toggle = (key) => {
    setOpenSections((cur) => ({ ...cur, [key]: !cur[key] }));
  };

  return (
    <section className="yt-settings" aria-label="YouTube Settings">
      <header className="yt-settings__header">
        <span className="yt-settings__platform-dot" aria-hidden />
        <div>
          <h2 className="yt-settings__title">YouTube Settings</h2>
          <p className="yt-settings__subtitle">Video options for selected YouTube channel</p>
        </div>
      </header>

      {/* Custom thumbnail — always visible like Brightbean */}
      <div className="yt-settings__thumb-block">
        <span className="yt-settings__label">Custom thumbnail</span>
        <div className="yt-settings__thumb-row">
          {settings.thumbnail_url ? (
            <div className="yt-settings__thumb-preview">
              <img src={settings.thumbnail_url} alt="Selected YouTube thumbnail" />
              <button
                type="button"
                className="yt-settings__thumb-clear"
                aria-label="Remove thumbnail"
                onClick={() => patch({ thumbnail_asset_id: null, thumbnail_url: '' })}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="yt-settings__thumb-empty" aria-hidden>
              <ImagePlus size={22} />
            </div>
          )}
          <div className="yt-settings__thumb-actions">
            <button type="button" className="yt-settings__btn" onClick={onOpenThumbnail}>
              Custom Thumbnail
            </button>
            <p className="yt-settings__hint">16:9 JPEG or PNG, max 2 MB. Capture a frame or upload.</p>
          </div>
        </div>
        {errors.thumbnail ? <p className="yt-settings__error" role="alert">{errors.thumbnail}</p> : null}
      </div>

      <Accordion id={`${baseId}-basic`} title="Basic" open={openSections.basic} onToggle={() => toggle('basic')}>
        <div className="yt-settings__grid">
          <div className="yt-settings__field yt-settings__field--full">
            <label className="yt-settings__label" htmlFor={`${baseId}-title`}>
              Video title override
              <span className="yt-settings__count">{(settings.title_override || '').length}/{YT_TITLE_MAX}</span>
            </label>
            <input
              id={`${baseId}-title`}
              className={`yt-settings__input${errors.title_override ? ' is-invalid' : ''}`}
              value={settings.title_override || ''}
              maxLength={YT_TITLE_MAX}
              placeholder="Overrides post title for YouTube"
              onChange={(e) => patch({ title_override: e.target.value })}
            />
            {errors.title_override ? <p className="yt-settings__error">{errors.title_override}</p> : null}
          </div>
          <div className="yt-settings__field yt-settings__field--full">
            <label className="yt-settings__label" htmlFor={`${baseId}-desc`}>
              Description override
              <span className="yt-settings__count">{(settings.description_override || '').length}/{YT_DESCRIPTION_MAX}</span>
            </label>
            <textarea
              id={`${baseId}-desc`}
              className={`yt-settings__textarea${errors.description_override ? ' is-invalid' : ''}`}
              rows={4}
              value={settings.description_override || ''}
              maxLength={YT_DESCRIPTION_MAX}
              placeholder="Overrides caption for YouTube"
              onChange={(e) => patch({ description_override: e.target.value })}
            />
            {errors.description_override ? <p className="yt-settings__error">{errors.description_override}</p> : null}
          </div>
          <div className="yt-settings__field yt-settings__field--full">
            <label className="yt-settings__label" htmlFor={`${baseId}-tags`}>Tags</label>
            <input
              id={`${baseId}-tags`}
              className={`yt-settings__input${errors.tags ? ' is-invalid' : ''}`}
              value={tagsToInput(settings.tags)}
              placeholder="vlog, travel, daily"
              onChange={(e) => patch({ tags: tagsFromInput(e.target.value) })}
            />
            <p className="yt-settings__hint">Comma-separated SEO tags (separate from internal team tags)</p>
            {errors.tags ? <p className="yt-settings__error">{errors.tags}</p> : null}
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-cat`}>Category</label>
            <select
              id={`${baseId}-cat`}
              className="yt-settings__select"
              value={settings.category_id || '22'}
              onChange={(e) => patch({ category_id: e.target.value })}
            >
              {YT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-playlist`}>Playlist ID</label>
            <input
              id={`${baseId}-playlist`}
              className="yt-settings__input"
              value={settings.playlist_id || ''}
              placeholder="PLxxxxxxxx"
              onChange={(e) => patch({ playlist_id: e.target.value })}
            />
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-lang`}>Language</label>
            <input
              id={`${baseId}-lang`}
              className="yt-settings__input"
              value={settings.language || ''}
              placeholder="en"
              onChange={(e) => patch({ language: e.target.value })}
            />
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-rec-date`}>Recording date</label>
            <input
              id={`${baseId}-rec-date`}
              type="date"
              className="yt-settings__input"
              value={settings.recording_date || ''}
              onChange={(e) => patch({ recording_date: e.target.value })}
            />
          </div>
          <div className="yt-settings__field yt-settings__field--full">
            <label className="yt-settings__label" htmlFor={`${baseId}-rec-loc`}>Recording location</label>
            <input
              id={`${baseId}-rec-loc`}
              className="yt-settings__input"
              value={settings.recording_location || ''}
              placeholder="City, Country"
              onChange={(e) => patch({ recording_location: e.target.value })}
            />
          </div>
        </div>
      </Accordion>

      <Accordion
        id={`${baseId}-vis`}
        title="Visibility"
        open={openSections.visibility}
        onToggle={() => toggle('visibility')}
      >
        <VisibilitySelector
          privacy={settings.privacy_status}
          onPrivacyChange={(privacy_status) => patch({ privacy_status })}
          scheduleAt={settings.schedule_publish_at}
          onScheduleAtChange={(schedule_publish_at) => patch({ schedule_publish_at })}
          isPremiere={settings.is_premiere}
          onPremiereChange={(is_premiere) => patch({ is_premiere })}
          scheduleError={errors.schedule_publish_at}
        />
      </Accordion>

      <Accordion
        id={`${baseId}-aud`}
        title="Audience"
        open={openSections.audience}
        onToggle={() => toggle('audience')}
      >
        <AudienceSelector
          madeForKids={settings.made_for_kids}
          onMadeForKidsChange={(made_for_kids) => patch({
            made_for_kids,
            age_restriction: made_for_kids ? false : settings.age_restriction,
          })}
          ageRestriction={settings.age_restriction}
          onAgeRestrictionChange={(age_restriction) => patch({ age_restriction })}
          error={errors.made_for_kids}
        />
      </Accordion>

      <Accordion
        id={`${baseId}-lic`}
        title="License"
        open={openSections.license}
        onToggle={() => toggle('license')}
      >
        <div className="yt-settings__radio-col" role="radiogroup" aria-label="License">
          {YT_LICENSE_OPTIONS.map((o) => (
            <label key={o.id} className="yt-settings__check">
              <input
                type="radio"
                name={`${baseId}-license`}
                checked={settings.license === o.id}
                onChange={() => patch({ license: o.id })}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </Accordion>

      <Accordion
        id={`${baseId}-dist`}
        title="Distribution"
        open={openSections.distribution}
        onToggle={() => toggle('distribution')}
      >
        <label className="yt-settings__check">
          <input
            type="checkbox"
            checked={!!settings.embeddable}
            onChange={(e) => patch({ embeddable: e.target.checked })}
          />
          <span>Allow embedding</span>
        </label>
        <label className="yt-settings__check">
          <input
            type="checkbox"
            checked={!!settings.publish_to_subscriptions}
            onChange={(e) => patch({ publish_to_subscriptions: e.target.checked })}
          />
          <span>Publish to subscription feed</span>
        </label>
        <label className="yt-settings__check">
          <input
            type="checkbox"
            checked={!!settings.notify_subscribers}
            onChange={(e) => patch({ notify_subscribers: e.target.checked })}
          />
          <span>Notify subscribers</span>
        </label>
      </Accordion>

      <Accordion
        id={`${baseId}-com`}
        title="Comments"
        open={openSections.comments}
        onToggle={() => toggle('comments')}
      >
        <label className="yt-settings__check">
          <input
            type="checkbox"
            checked={!!settings.allow_comments}
            onChange={(e) => patch({
              allow_comments: e.target.checked,
              comment_moderation: e.target.checked ? settings.comment_moderation : 'disable',
            })}
          />
          <span>Allow comments</span>
        </label>
        <div className="yt-settings__field">
          <label className="yt-settings__label" htmlFor={`${baseId}-mod`}>Comment moderation</label>
          <select
            id={`${baseId}-mod`}
            className="yt-settings__select"
            value={settings.comment_moderation || 'automatic'}
            disabled={!settings.allow_comments}
            onChange={(e) => patch({ comment_moderation: e.target.value })}
          >
            {YT_COMMENT_MODERATION.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="yt-settings__field">
          <label className="yt-settings__label" htmlFor={`${baseId}-sort`}>Sort comments</label>
          <select
            id={`${baseId}-sort`}
            className="yt-settings__select"
            value={settings.sort_comments || 'top'}
            disabled={!settings.allow_comments}
            onChange={(e) => patch({ sort_comments: e.target.value })}
          >
            {YT_COMMENT_SORT.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <p className="yt-settings__hint">Moderation preferences are saved with the draft; applied when the platform API supports them.</p>
      </Accordion>

      <Accordion
        id={`${baseId}-adv`}
        title="Advanced"
        open={openSections.advanced}
        onToggle={() => toggle('advanced')}
      >
        <div className="yt-settings__checks">
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.paid_promotion} onChange={(e) => patch({ paid_promotion: e.target.checked })} />
            <span>Paid promotion</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.altered_content} onChange={(e) => patch({ altered_content: e.target.checked })} />
            <span>Altered content</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.automatic_chapters} onChange={(e) => patch({ automatic_chapters: e.target.checked })} />
            <span>Automatic chapters</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.automatic_places} onChange={(e) => patch({ automatic_places: e.target.checked })} />
            <span>Automatic places</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.automatic_concepts} onChange={(e) => patch({ automatic_concepts: e.target.checked })} />
            <span>Automatic concepts</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.automatic_tags} onChange={(e) => patch({ automatic_tags: e.target.checked })} />
            <span>Automatic tags</span>
          </label>
          <label className="yt-settings__check">
            <input type="checkbox" checked={!!settings.allow_remixing} onChange={(e) => patch({ allow_remixing: e.target.checked })} />
            <span>Allow remixing</span>
          </label>
        </div>
        <div className="yt-settings__field">
          <label className="yt-settings__label" htmlFor={`${baseId}-shorts-remix`}>Shorts remix permission</label>
          <select
            id={`${baseId}-shorts-remix`}
            className="yt-settings__select"
            value={settings.shorts_remix || 'allow'}
            onChange={(e) => patch({ shorts_remix: e.target.value })}
          >
            {YT_SHORTS_REMIX.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </Accordion>

      <Accordion
        id={`${baseId}-meta`}
        title="Metadata"
        open={openSections.metadata}
        onToggle={() => toggle('metadata')}
      >
        <div className="yt-settings__grid">
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-vlang`}>Video language</label>
            <input
              id={`${baseId}-vlang`}
              className="yt-settings__input"
              value={settings.video_language || ''}
              placeholder="en"
              onChange={(e) => patch({ video_language: e.target.value })}
            />
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-alang`}>Default audio language</label>
            <input
              id={`${baseId}-alang`}
              className="yt-settings__input"
              value={settings.default_audio_language || ''}
              placeholder="en"
              onChange={(e) => patch({ default_audio_language: e.target.value })}
            />
          </div>
          <div className="yt-settings__field">
            <label className="yt-settings__label" htmlFor={`${baseId}-cap`}>Caption certification</label>
            <select
              id={`${baseId}-cap`}
              className="yt-settings__select"
              value={settings.caption_certification || 'none'}
              onChange={(e) => patch({ caption_certification: e.target.value })}
            >
              {YT_CAPTION_CERT.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="yt-settings__field yt-settings__field--full">
            <label className="yt-settings__label" htmlFor={`${baseId}-cdecl`}>Content declaration</label>
            <textarea
              id={`${baseId}-cdecl`}
              className="yt-settings__textarea"
              rows={2}
              value={settings.content_declaration || ''}
              placeholder="Optional disclosure notes"
              onChange={(e) => patch({ content_declaration: e.target.value })}
            />
          </div>
        </div>
      </Accordion>
    </section>
  );
}

YoutubeSettingsPanel.propTypes = {
  value: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onOpenThumbnail: PropTypes.func.isRequired,
  errors: PropTypes.object,
  validateOnChange: PropTypes.bool,
};
