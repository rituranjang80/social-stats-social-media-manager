/* ============================================================================
 * Compact Org → Workspace breadcrumb for the composer header / mobile.
 * ========================================================================== */
import { Link } from 'react-router-dom';
import { ChevronRight, Building2, Layers } from 'lucide-react';

export default function ComposerTenantBar({ tenant }) {
  if (!tenant) return null;

  const { organization, workspace, roleLabel, links, workspaces } = tenant;

  return (
    <nav className="composer-tenant-bar" aria-label="Organization and workspace">
      <ol className="composer-tenant-bar__crumbs">
        <li className="composer-tenant-bar__crumb">
          <Building2 size={12} aria-hidden="true" />
          <span className="composer-tenant-bar__text" title={organization.label}>
            {organization.label}
          </span>
        </li>
        <li className="composer-tenant-bar__sep" aria-hidden="true">
          <ChevronRight size={12} />
        </li>
        <li className="composer-tenant-bar__crumb composer-tenant-bar__crumb--current">
          <Layers size={12} aria-hidden="true" />
          <span className="composer-tenant-bar__text" title={workspace.label}>
            {workspace.label}
          </span>
        </li>
        {roleLabel && (
          <>
            <li className="composer-tenant-bar__sep" aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li className="composer-tenant-bar__crumb">
              <span className="composer-tenant-bar__role">{roleLabel}</span>
            </li>
          </>
        )}
      </ol>

      <div className="composer-tenant-bar__meta">
        {workspaces.length > 1 && (
          <span className="composer-tenant-bar__count">
            {workspaces.length} workspaces
          </span>
        )}
        <Link to={links.workspaces} className="composer-tenant-bar__link">
          Manage
        </Link>
      </div>
    </nav>
  );
}
