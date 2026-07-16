/* ============================================================================
 * Scrollable content slot for CollapsibleRail.
 * ========================================================================== */
import styles from './CollapsibleRail.module.scss';

export default function RailContent({ children, className = '' }) {
  return (
    <div className={[styles.railContent, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
