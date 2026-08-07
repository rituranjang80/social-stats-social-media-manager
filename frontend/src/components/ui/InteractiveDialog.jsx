/* ============================================================================
 * InteractiveDialog — global typed dialog (confirm, alert, prompt, custom).
 * Styles: styles/scss/ui/_interactive-dialog.scss
 * ========================================================================== */
import {
  useCallback, useEffect, useId, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  Send,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import Button from './Button';
import '../../styles/scss/ui/_interactive-dialog.scss';

const TYPE_META = {
  info: { Icon: Info, tone: 'info' },
  success: { Icon: CheckCircle2, tone: 'success' },
  error: { Icon: XCircle, tone: 'error' },
  warning: { Icon: AlertTriangle, tone: 'warning' },
  question: { Icon: HelpCircle, tone: 'question' },
  delete: { Icon: Trash2, tone: 'delete' },
  danger: { Icon: Trash2, tone: 'danger' },
  publish: { Icon: Send, tone: 'publish' },
  schedule: { Icon: CalendarClock, tone: 'schedule' },
  custom: { Icon: Info, tone: 'custom' },
};

const SIZE_CLASS = {
  sm: 'ds-idialog__panel--sm',
  md: 'ds-idialog__panel--md',
  lg: 'ds-idialog__panel--lg',
  xl: 'ds-idialog__panel--xl',
  auto: 'ds-idialog__panel--auto',
  fullscreen: 'ds-idialog__panel--fullscreen',
};

/**
 * @param {object} props — see showDialog() in services/dialog.js
 */
export default function InteractiveDialog({
  open,
  closing = false,
  type = 'info',
  title,
  subtitle,
  message,
  content,
  icon: IconOverride,
  image,
  imageAlt = '',
  buttons = [],
  prompt,
  loading = false,
  progress,
  size = 'md',
  width,
  closeOnOverlay = true,
  closeOnEsc = true,
  showClose = true,
  footerSticky = true,
  stackButtonsOnMobile = true,
  glass = false,
  onClose,
  onButton,
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef(null);
  const lastFocusRef = useRef(null);
  const [promptValue, setPromptValue] = useState(prompt?.defaultValue ?? '');

  useEffect(() => {
    if (open) setPromptValue(prompt?.defaultValue ?? '');
  }, [open, prompt?.defaultValue]);

  const finish = useCallback((payload) => {
    onButton?.(payload);
  }, [onButton]);

  useEffect(() => {
    if (!open) return undefined;
    lastFocusRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault();
        finish({ buttonId: null, value: null });
        return;
      }
      if (e.key === 'Enter' && !e.defaultPrevented) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'textarea') return;
        const primary = buttons.find((b) => b.primary);
        if (primary && !primary.disabled && !loading) {
          e.preventDefault();
          finish({
            buttonId: primary.id,
            value: prompt ? promptValue : undefined,
          });
        }
      }
    };

    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const t = setTimeout(() => {
      const root = panelRef.current;
      if (!root) return;
      const input = root.querySelector('.ds-idialog__input, .ds-idialog__textarea');
      const focusable = input || root.querySelector(
        'button:not([disabled]), [href], input, select, textarea',
      );
      focusable?.focus?.();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      lastFocusRef.current?.focus?.();
    };
  }, [open, closeOnEsc, buttons, finish, loading, prompt, promptValue]);

  function onKeyDownTrap(e) {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
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

  if (!open && !closing) return null;

  const meta = TYPE_META[type] || TYPE_META.info;
  const Icon = IconOverride || meta.Icon;
  const tone = meta.tone;

  const panelClass = [
    'ds-idialog__panel',
    SIZE_CLASS[size] || SIZE_CLASS.md,
    glass ? 'ds-idialog__panel--glass' : '',
  ].filter(Boolean).join(' ');

  const overlayClass = [
    'ds-idialog__overlay',
    closing ? 'ds-idialog__overlay--closing' : '',
  ].filter(Boolean).join(' ');

  const footerClass = [
    'ds-idialog__footer',
    footerSticky ? 'ds-idialog__footer--sticky' : '',
    stackButtonsOnMobile ? 'ds-idialog__footer--stack' : '',
  ].filter(Boolean).join(' ');

  const node = (
    <div
      className={overlayClass}
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget && !loading) {
          finish({ buttonId: null, value: null });
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={message || subtitle ? descId : undefined}
        className={panelClass}
        style={width ? { maxWidth: width } : undefined}
        onKeyDown={onKeyDownTrap}
        tabIndex={-1}
      >
        <header className="ds-idialog__header">
          {!image && Icon ? (
            <div className={`ds-idialog__icon-wrap ds-idialog__icon-wrap--${tone}`}>
              <Icon size={22} aria-hidden />
            </div>
          ) : null}
          <div className="ds-idialog__head-text">
            {title ? <h2 id={titleId} className="ds-idialog__title">{title}</h2> : null}
            {subtitle ? <p className="ds-idialog__subtitle">{subtitle}</p> : null}
          </div>
          {showClose ? (
            <Button
              className="ds-idialog__close"
              variant="ghost"
              size="sm"
              iconOnly
              icon={X}
              aria-label="Close dialog"
              disabled={loading}
              onClick={() => finish({ buttonId: null, value: null })}
            />
          ) : null}
        </header>

        <div className="ds-idialog__body">
          {message ? (
            <p id={descId} className="ds-idialog__message">{message}</p>
          ) : null}
          {content ? <div className="ds-idialog__content">{content}</div> : null}
          {image ? (
            <img src={image} alt={imageAlt} className="ds-idialog__image" />
          ) : null}
          {prompt ? (
            <div className="ds-idialog__field">
              {prompt.label ? (
                <span className="ds-idialog__field-label">{prompt.label}</span>
              ) : null}
              {prompt.multiline ? (
                <textarea
                  className="ds-idialog__textarea"
                  value={promptValue}
                  placeholder={prompt.placeholder}
                  onChange={(e) => setPromptValue(e.target.value)}
                  disabled={loading}
                />
              ) : (
                <input
                  type={prompt.inputType || 'text'}
                  className="ds-idialog__input"
                  value={promptValue}
                  placeholder={prompt.placeholder}
                  onChange={(e) => setPromptValue(e.target.value)}
                  disabled={loading}
                />
              )}
            </div>
          ) : null}
          {typeof progress === 'number' ? (
            <div className="ds-idialog__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="ds-idialog__progress-bar" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
            </div>
          ) : null}
          {loading ? (
            <p className="ds-idialog__message ds-idialog__loading">
              <Loader2 size={16} className="ds-spin" aria-hidden />
              Please wait…
            </p>
          ) : null}
        </div>

        {buttons.length > 0 ? (
          <footer className={footerClass}>
            {buttons.map((btn) => (
              <Button
                key={btn.id}
                variant={btn.variant || 'secondary'}
                size={btn.size || 'md'}
                icon={btn.icon}
                loading={btn.loading || (loading && btn.primary)}
                disabled={btn.disabled || (loading && !btn.primary)}
                fullWidth={stackButtonsOnMobile}
                onClick={() => finish({
                  buttonId: btn.id,
                  value: prompt ? promptValue : undefined,
                })}
              >
                {btn.label}
              </Button>
            ))}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(node, document.body)
    : node;
}
