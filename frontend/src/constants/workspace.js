/* Global workspace scope — admin analytics aggregates all clients when selected. */

export const ALL_WORKSPACES_ID = '__all__';

export const ALL_WORKSPACES = {
  id: ALL_WORKSPACES_ID,
  label: 'All workspaces',
  company: 'All workspaces',
  name: 'All workspaces',
  initial: 'A',
  logo: null,
  slug: null,
  raw: null,
};

export function isAllWorkspacesId(id) {
  return id === ALL_WORKSPACES_ID || id === 'all';
}
