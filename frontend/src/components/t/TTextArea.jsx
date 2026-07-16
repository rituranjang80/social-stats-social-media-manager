/* ============================================================================
 * T-Type textarea — generic labeled multi-line field.
 * ========================================================================== */
export default function TTextArea({
  id,
  label,
  hint,
  meta,
  size = 'md',
  className = '',
  textareaClassName = '',
  rows = 4,
  ...props
}) {
  const inputId = id || props.name || undefined;

  return (
    <div className={['t-field', className].filter(Boolean).join(' ')}>
      {(label || meta) ? (
        <div className="t-field__label-row">
          {label ? (
            <label className="t-field__label" htmlFor={inputId}>{label}</label>
          ) : <span />}
          {meta ? <span className="t-card__meta">{meta}</span> : null}
        </div>
      ) : null}
      <textarea
        id={inputId}
        rows={rows}
        className={[
          't-field__textarea',
          size === 'sm' ? 't-field__textarea--sm' : '',
          textareaClassName,
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {hint ? <p className="t-field__hint">{hint}</p> : null}
    </div>
  );
}
