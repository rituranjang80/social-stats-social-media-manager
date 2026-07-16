/* ============================================================================
 * Modal — accessible dialog with focus trap, Esc-to-close, optional drag.
 * Styles: styles/scss/ui/_modal.scss
 * ========================================================================== */
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import Button from './Button';
import '../../styles/scss/ui/_modal.scss';

const SIZE_CLASS = {
  sm: 'ds-modal__dialog--sm',
  md: 'ds-modal__dialog--md',
  lg: 'ds-modal__dialog--lg',
  xl: 'ds-modal__dialog--xl',
};

/**
 * Props:
 *   open, onClose, title, description, ariaLabel
 *   size: 'sm' | 'md' | 'lg' | 'xl'
 *   children, footer
 *   closeOnBackdrop: default true
 *   showClose: default true
 *   draggable: drag by header (desktop)
 *   elevated: higher z-index (above rails / preview toggles)
 *   className / overlayClassName
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
  showClose = true,
  draggable = false,
  elevated = false,
  className = '',
  overlayClassName = '',
}) {
  const dialogRef = useRef(null);
  const lastFocusRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    lastFocusRef.current = document.activeElement;

    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable || root).focus?.();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      lastFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  // Reset drag position when closed / reopened
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    dialogRef.current.style.setProperty('--ds-modal-x', '0px');
    dialogRef.current.style.setProperty('--ds-modal-y', '0px');
  }, [open]);

  function onKeyDown(e) {
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const onDragPointerDown = useCallback((e) => {
    if (!draggable) return;
    // Don't start drag from interactive controls in the header
    if (e.target.closest('button, a, input, select, textarea')) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const prevX = parseFloat(getComputedStyle(dialog).getPropertyValue('--ds-modal-x')) || 0;
    const prevY = parseFloat(getComputedStyle(dialog).getPropertyValue('--ds-modal-y')) || 0;

    dragRef.current = { startX, startY, prevX, prevY, pointerId: e.pointerId };
    dialog.classList.add('ds-modal__dialog--dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [draggable]);

  const onDragPointerMove = useCallback((e) => {
    const state = dragRef.current;
    const dialog = dialogRef.current;
    if (!state || !dialog) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    dialog.style.setProperty('--ds-modal-x', `${state.prevX + dx}px`);
    dialog.style.setProperty('--ds-modal-y', `${state.prevY + dy}px`);
  }, []);

  const onDragPointerUp = useCallback((e) => {
    const state = dragRef.current;
    if (!state) return;
    dragRef.current = null;
    dialogRef.current?.classList.remove('ds-modal__dialog--dragging');
    e.currentTarget.releasePointerCapture?.(state.pointerId);
  }, []);

  if (!open) return null;

  const overlayClasses = [
    'ds-modal__overlay',
    elevated ? 'ds-modal__overlay--elevated' : '',
    overlayClassName,
  ].filter(Boolean).join(' ');

  const dialogClasses = [
    'ds-modal__dialog',
    SIZE_CLASS[size] || SIZE_CLASS.md,
    draggable ? 'ds-modal__dialog--draggable' : '',
    className,
  ].filter(Boolean).join(' ');

  const headerClasses = [
    'ds-modal__header',
    draggable ? 'ds-modal__header--drag' : '',
    !title ? 'ds-modal__header--plain' : '',
  ].filter(Boolean).join(' ');

  const node = (
    <div
      className={overlayClasses}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? 'ds-modal-title' : undefined}
        aria-describedby={description ? 'ds-modal-desc' : undefined}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        className={dialogClasses}
      >
        {(title || showClose) && (
          <header
            className={headerClasses}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            <div className="ds-modal__title-block">
              {title && (
                <h2 id="ds-modal-title" className="ds-modal__title">{title}</h2>
              )}
              {description && (
                <p id="ds-modal-desc" className="ds-modal__desc">{description}</p>
              )}
            </div>
            {showClose && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={X}
                aria-label="Close dialog"
                onClick={onClose}
              />
            )}
          </header>
        )}

        <div className="ds-modal__body">{children}</div>

        {footer ? (
          <footer className="ds-modal__footer">{footer}</footer>
        ) : null}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node;
}
