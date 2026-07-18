/* ============================================================================
 * Reusable Composer section with optional disclosure behavior.
 * ========================================================================== */
import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

export default function ComposerSection({
  title,
  description,
  icon: Icon,
  children,
  collapsible = false,
  defaultOpen = true,
  className = '',
}) {
  const regionId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const expanded = collapsible ? open : true;

  return (
    <section
      className={[
        'composer-section',
        collapsible ? 'composer-section--collapsible' : '',
        expanded ? 'is-open' : 'is-closed',
        className,
      ].filter(Boolean).join(' ')}
      aria-labelledby={`${regionId}-title`}
    >
      <div className="composer-section__header">
        {Icon ? (
          <span className="composer-section__icon" aria-hidden="true">
            <Icon size={16} strokeWidth={2} />
          </span>
        ) : null}
        <div className="composer-section__heading">
          <h2 id={`${regionId}-title`} className="composer-section__title">{title}</h2>
          {description ? (
            <p className="composer-section__description">{description}</p>
          ) : null}
        </div>
        {collapsible ? (
          <button
            type="button"
            className="composer-section__toggle"
            aria-expanded={expanded}
            aria-controls={`${regionId}-content`}
            onClick={() => setOpen((value) => !value)}
          >
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div
        id={`${regionId}-content`}
        className="composer-section__content"
        hidden={!expanded}
      >
        {children}
      </div>
    </section>
  );
}

ComposerSection.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  icon: PropTypes.elementType,
  children: PropTypes.node,
  collapsible: PropTypes.bool,
  defaultOpen: PropTypes.bool,
  className: PropTypes.string,
};
