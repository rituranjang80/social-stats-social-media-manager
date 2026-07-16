/* ============================================================================
 * Generic Collapsible Rail — wired for AppShell FeatureSidebar collapse.
 * SCSS modules only (no styled-jsx).
 * Syncs aria-expanded + html layout classes in the same tick as the click.
 * ========================================================================== */
import { useEffect, useLayoutEffect, useId, useState, Suspense, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CollapsibleRail.module.scss';

import '../../../styles/base/_themes.scss';
import '../../../styles/base/_reset.scss';

const STORAGE_KEY = 'socialstats.feature-sidebar-expanded';
const HTML_COLLAPSED = 'feature-sidebar-collapsed';
const HTML_ACTIVE = 'collapsible-feature-rail-active';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

function syncShellLayout(isExpanded) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.add(HTML_ACTIVE);
  root.classList.toggle(HTML_COLLAPSED, !isExpanded);
}

function clearShellLayout() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove(HTML_ACTIVE, HTML_COLLAPSED);
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} [props.header]
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.ariaLabel]
 * @param {boolean} [props.defaultExpanded]
 * @param {boolean} [props.persist]
 * @param {boolean} [props.shellLayout] — sync --feature-sidebar-width via html class
 * @param {string} [props.className]
 * @param {(expanded: boolean) => void} [props.onExpandedChange]
 */
export default function CollapsibleRail({
  header,
  children,
  ariaLabel = 'Feature navigation',
  defaultExpanded = true,
  persist = true,
  shellLayout = false,
  className = '',
  onExpandedChange,
}) {
  const reactId = useId();
  const [isExpanded, setIsExpanded] = useState(() => {
    let initial = defaultExpanded;
    if (persist && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === '0') initial = false;
        if (raw === '1') initial = true;
      } catch {
        /* ignore */
      }
    }
    // Seed html classes before first paint when possible
    if (shellLayout && typeof document !== 'undefined') {
      syncShellLayout(initial);
    }
    return initial;
  });

  useLayoutEffect(() => {
    if (!shellLayout) return undefined;
    syncShellLayout(isExpanded);
    return () => {
      clearShellLayout();
    };
  }, [shellLayout, isExpanded]);

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(STORAGE_KEY, isExpanded ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [persist, isExpanded]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  const toggleRail = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      // Keep html layout class in lockstep with aria-expanded (same click tick)
      if (shellLayout) syncShellLayout(next);
      return next;
    });
  }, [shellLayout]);

  const labelId = `${reactId}-rail-label`;

  return (
    <div
      className={cx(
        'collapsible-rail-root',
        shellLayout && 'ds-feature-collapsible-rail',
        className,
      )}
    >
      <aside
        className={cx(styles.railContainer, isExpanded && styles.isExpanded)}
        aria-expanded={isExpanded}
        aria-label={ariaLabel}
        id={labelId}
        aria-hidden={!isExpanded}
      >
        {header ? <header>{header}</header> : null}

        <div className={styles.scrollArea}>
          <Suspense fallback={<div className={styles.fallback}>Loading…</div>}>
            {children}
          </Suspense>
        </div>
      </aside>

      <button
        type="button"
        className={cx(styles.toggleBtn, isExpanded && styles.shifted)}
        onClick={toggleRail}
        aria-controls={labelId}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isExpanded
          ? <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
          : <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />}
      </button>
    </div>
  );
}
