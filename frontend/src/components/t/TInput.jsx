/* ============================================================================
 * T-Type text input — generic labeled field.
 * ========================================================================== */
export default function TInput({
  id,
  label,
  hint,
  meta,
  className = '',
  inputClassName = '',
  type = 'text',
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
      <input
        id={inputId}
        type={type}
        className={['t-field__input', inputClassName].filter(Boolean).join(' ')}
        {...props}
      />
      {hint ? <p className="t-field__hint">{hint}</p> : null}
    </div>
  );
}
