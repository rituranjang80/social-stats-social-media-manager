/**
 * Generic content panel / card shell.
 */
export default function TPanel({
  title,
  subtitle,
  action,
  children,
  flush = false,
  sunken = false,
  className = '',
  bodyClassName = '',
}) {
  const classes = [
    't-panel',
    flush ? 't-panel--flush' : '',
    sunken ? 't-panel--sunken' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <section className={classes}>
      {(title || action) && (
        <div className="t-panel__header">
          <div>
            {title ? <h3 className="t-panel__title">{title}</h3> : null}
            {subtitle ? <p className="t-panel__subtitle">{subtitle}</p> : null}
          </div>
          {action || null}
        </div>
      )}
      <div className={`t-panel__body ${bodyClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
