/**
 * @module workspace
 * Global workspace (client) context and switcher UI.
 */
export { default as useWorkspace, normalizeWorkspace, invalidateWorkspaceQueries } from '../../hooks/useWorkspace';
export { default as WorkspaceSwitcher } from '../../components/workspace/WorkspaceSwitcher';
export { ALL_WORKSPACES, ALL_WORKSPACES_ID, isAllWorkspacesId } from '../../constants/workspace';
