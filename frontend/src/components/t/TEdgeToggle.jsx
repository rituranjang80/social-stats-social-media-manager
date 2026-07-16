/* ============================================================================
 * Edge collapse/expand toggle — left or right rail (plug-and-play).
 * ========================================================================== */
import { ChevronLeft, ChevronRight } from 'lucide-react';

import '../../styles/scss/t/_t-edge-toggle.scss';

/**
 * @param {object} props
 * @param {'left'|'right'} [props.side]
 * @param {boolean} props.expanded
 * @param {() => void} props.onToggle
 * @param {'center'|'top'} [props.align]
 * @param {string} [props.expandLabel]
 * @param {string} [props.collapseLabel]
 * @param {string} [props.className]
 * @param {string} [props.controlsId]
 */
export default function TEdgeToggle({
  side = 'right',
  expanded = true,
  onToggle,
  align = 'center',
  expandLabel,
  collapseLabel,
  className = '',
  controlsId,
}) {
  const isRight = side === 'right';
  const label = expanded
    ? (collapseLabel || (isRight ? 'Collapse preview' : 'Collapse sidebar'))
    : (expandLabel || (isRight ? 'Expand preview' : 'Expand sidebar'));

  const Icon = (() => {
    if (isRight) return expanded ? ChevronRight : ChevronLeft;
    return expanded ? ChevronLeft : ChevronRight;
  })();

  return (
    <button
      type="button"
      className={[
        't-edge-toggle',
        `t-edge-toggle--${side}`,
        expanded ? 'is-expanded' : 'is-collapsed',
        align === 'top' ? 'is-top-aligned' : '',
        className,
      ].filter(Boolean).join(' ')}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={label}
    >
      <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
