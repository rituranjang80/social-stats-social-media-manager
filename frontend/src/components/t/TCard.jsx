/* ============================================================================
 * T-Type section card — reusable labeled container.
 * ========================================================================== */
import { useId } from 'react';

export default function TCard({
  label,
  meta,
  children,
  gridSpan,
  headingId,
  className = '',
  flush = false,
  sunken = false,
  dashed = false,
  as: Tag = 'section',
  ...rest
}) {
  const generatedId = useId();
  const resolvedHeadingId = headingId || `${generatedId}-heading`;
  const classes = [
    't-card',
    gridSpan ? `t-card--span-${gridSpan}` : '',
    flush ? 't-card--flush' : '',
    sunken ? 't-card--sunken' : '',
    dashed ? 't-card--dashed' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Tag
      className={classes}
      aria-labelledby={label && !rest['aria-label'] ? resolvedHeadingId : undefined}
      {...rest}
    >
      {(label || meta) ? (
        <header className="t-card__header">
          {label ? <h2 id={resolvedHeadingId} className="t-card__label">{label}</h2> : <span />}
          {meta ? <div className="t-card__meta">{meta}</div> : null}
        </header>
      ) : null}
      <div className="t-card__body">{children}</div>
    </Tag>
  );
}
