/* ============================================================================
 * Composer page header — back + title + mobile preview.
 * Workspace switching lives in the global TopBar.
 * ========================================================================== */
import { ArrowLeft, Eye } from 'lucide-react';

export default function ComposerHeader({
  title = 'Create',
  previewCount = 0,
  onBack,
  onPreview,
}) {
  return (
    <header className="composer__header">
      <button
        type="button"
        className="composer__back"
        onClick={onBack}
        aria-label="Go back"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <h1 className="composer__title">{title}</h1>

      <div className="composer__header-actions">
        <button
          type="button"
          className="composer-preview-toggle"
          onClick={onPreview}
          aria-controls="composer-preview"
        >
          <Eye size={16} strokeWidth={2} aria-hidden="true" />
          <span>Preview</span>
          {previewCount > 0 && (
            <span className="composer__preview-count" aria-hidden="true">
              {previewCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
