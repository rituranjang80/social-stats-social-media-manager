/* ============================================================================
 * Floating composer preview — opened via double-click on the preview panel.
 * Draggable by header; no backdrop (composer stays usable underneath).
 * ========================================================================== */
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GripHorizontal, X } from 'lucide-react';

const FLOAT_POS_KEY = 'socialstats.composer-preview-float-pos';

function readFloatPos() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FLOAT_POS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export default function ComposerPreviewFloatingPopup({
  open,
  onClose,
  children,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const saved = readFloatPos();
    const el = panelRef.current;
    if (saved) {
      el.style.setProperty('--composer-float-x', `${saved.x}px`);
      el.style.setProperty('--composer-float-y', `${saved.y}px`);
    } else {
      el.style.setProperty('--composer-float-x', '0px');
      el.style.setProperty('--composer-float-y', '0px');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const persistPos = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const x = parseFloat(getComputedStyle(el).getPropertyValue('--composer-float-x')) || 0;
    const y = parseFloat(getComputedStyle(el).getPropertyValue('--composer-float-y')) || 0;
    try {
      localStorage.setItem(FLOAT_POS_KEY, JSON.stringify({ x, y }));
    } catch {
      /* ignore */
    }
  }, []);

  const onDragPointerDown = useCallback((e) => {
    if (e.target.closest('button, a, input, select, textarea')) return;
    const panel = panelRef.current;
    if (!panel) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const prevX = parseFloat(getComputedStyle(panel).getPropertyValue('--composer-float-x')) || 0;
    const prevY = parseFloat(getComputedStyle(panel).getPropertyValue('--composer-float-y')) || 0;

    dragRef.current = { startX, startY, prevX, prevY, pointerId: e.pointerId };
    panel.classList.add('composer-preview-float--dragging');
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);

  const onDragPointerMove = useCallback((e) => {
    const state = dragRef.current;
    const panel = panelRef.current;
    if (!state || !panel) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    panel.style.setProperty('--composer-float-x', `${state.prevX + dx}px`);
    panel.style.setProperty('--composer-float-y', `${state.prevY + dy}px`);
  }, []);

  const onDragPointerUp = useCallback((e) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    panelRef.current?.classList.remove('composer-preview-float--dragging');
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    persistPos();
  }, [persistPos]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      className="composer-preview-float"
      role="dialog"
      aria-modal="false"
      aria-label="Floating live preview"
    >
      <header
        className="composer-preview-float__header"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        <div className="composer-preview-float__title">
          <GripHorizontal size={16} strokeWidth={2} aria-hidden="true" />
          <span>Live preview</span>
        </div>
        <button
          type="button"
          className="composer-preview-float__close"
          onClick={onClose}
          aria-label="Close floating preview"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>
      <div className="composer-preview-float__body">
        {children}
      </div>
    </div>,
    document.body,
  );
}
