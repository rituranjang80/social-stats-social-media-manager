/* ============================================================================
 * Workspace URLs — use public_id (UUID) in routes, not sequential numeric ids.
 * ========================================================================== */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * External workspace ref for URLs and API headers (public_id preferred).
 * @param {object|string|number|null} workspace
 */
export function workspaceRouteRef(workspace) {
  if (workspace == null || workspace === '') return null;
  if (typeof workspace === 'object') {
    const pid = workspace.publicId || workspace.public_id;
    if (pid) return String(pid);
    if (workspace.id != null) return String(workspace.id);
    return null;
  }
  return String(workspace);
}

/** True when ref looks like a UUID (not a bare integer). */
export function isWorkspacePublicRef(ref) {
  return UUID_RE.test(String(ref || '').trim());
}

/**
 * Admin client settings (Connect Accounts) for the active workspace.
 * @param {'/admin'|'/dashboard'} basePath
 * @param {object|string|number|null} workspace
 */
export function clientSettingsPath(basePath, workspace) {
  const ref = workspaceRouteRef(workspace);
  if (basePath === '/admin' && ref) {
    return `/admin/client/${ref}/settings`;
  }
  if (ref && basePath === '/dashboard') {
    return `${basePath}/settings`;
  }
  return `${basePath}/settings`;
}

export function clientWorkspacePath(basePath, workspace, suffix = '') {
  const ref = workspaceRouteRef(workspace);
  if (basePath === '/admin' && ref) {
    const tail = suffix ? (suffix.startsWith('/') ? suffix : `/${suffix}`) : '';
    return `/admin/client/${ref}${tail}`;
  }
  return basePath;
}

export default clientSettingsPath;
