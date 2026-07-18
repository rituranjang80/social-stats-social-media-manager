/* ============================================================================
 * Composer page header — back + title + mobile preview.
 * Workspace switching lives in the global TopBar.
 * ========================================================================== */
import PropTypes from 'prop-types';
import { ArrowLeft, Building2, Eye, Save } from 'lucide-react';

export default function ComposerHeader({
  title = 'Create',
  workspaceLabel = '',
  status = 'Draft',
  saving = false,
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

      <div className="composer__header-text">
        <nav className="composer__breadcrumb" aria-label="Breadcrumb">
          <span>Publish</span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <h1 className="composer__title">{title} post</h1>
        <p className="composer__subtitle">
          {workspaceLabel || 'Select a workspace to start composing'}
        </p>
      </div>

      <div className="composer__header-actions">
        {workspaceLabel ? (
          <span className="composer__workspace-chip" title={workspaceLabel}>
            <Building2 size={13} aria-hidden="true" />
            <span>{workspaceLabel}</span>
          </span>
        ) : null}
        <span
          className={`composer__status-chip${saving ? ' is-saving' : ''}`}
          role="status"
          aria-live="polite"
        >
          <Save size={12} aria-hidden="true" />
          {saving ? 'Saving…' : status}
        </span>
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

ComposerHeader.propTypes = {
  title: PropTypes.string,
  workspaceLabel: PropTypes.string,
  status: PropTypes.string,
  saving: PropTypes.bool,
  previewCount: PropTypes.number,
  onBack: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
};
