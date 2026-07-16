/* ============================================================================
 * Presentational header slot for CollapsibleRail.
 * ========================================================================== */
import styles from './CollapsibleRail.module.scss';

export default function RailHeader({
  title,
  subtitle,
  icon,
  children,
  className = '',
}) {
  if (children) {
    return (
      <div className={[styles.railHeader, className].filter(Boolean).join(' ')}>
        {children}
      </div>
    );
  }

  return (
    <div className={[styles.railHeader, className].filter(Boolean).join(' ')}>
      {icon ? <span className={styles.railHeaderIcon} aria-hidden="true">{icon}</span> : null}
      <div className={styles.railHeaderText}>
        {title ? <h2 className={styles.railHeaderTitle}>{title}</h2> : null}
        {subtitle ? <p className={styles.railHeaderSubtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
