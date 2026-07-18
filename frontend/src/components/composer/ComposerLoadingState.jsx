/* ============================================================================
 * Composer loading skeleton — keeps the page structure stable while editing.
 * ========================================================================== */
export default function ComposerLoadingState() {
  return (
    <div className="composer composer-loading" role="status" aria-live="polite">
      <span className="sr-only">Loading post editor…</span>
      <div className="composer-loading__header" aria-hidden="true">
        <span className="composer-loading__back" />
        <span className="composer-loading__title" />
        <span className="composer-loading__action" />
      </div>
      <div className="composer-loading__body" aria-hidden="true">
        <div className="composer-loading__editor">
          <span className="composer-loading__line composer-loading__line--short" />
          <span className="composer-loading__card" />
          <span className="composer-loading__card composer-loading__card--large" />
          <span className="composer-loading__card" />
        </div>
        <span className="composer-loading__preview" />
      </div>
    </div>
  );
}
