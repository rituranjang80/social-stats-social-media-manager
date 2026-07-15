/* ============================================================================
 * Global workspace (Client) context — list, hydrate, switch.
 * Synced with appStore; invalidates React Query on change.
 * ========================================================================== */
import { useCallback, useEffect, useMemo } from 'react';
import { clientsAPI } from '../services/api';
import { useAppStore, useCurrentClientId } from '../stores/appStore';
import { queryClient } from '../services/queryClient';

function initialFrom(name = '') {
  const t = String(name || '').trim();
  return t ? t[0].toUpperCase() : 'W';
}

export function normalizeWorkspace(row) {
  if (!row) return null;
  const id = row.id;
  const label = row.company || row.name || row.label || `Workspace #${id}`;
  return {
    id,
    label,
    company: row.company || row.name || label,
    name: row.name || row.company || label,
    slug: row.slug || null,
    initial: initialFrom(label),
    logo: row.logo || row.profile_image || null,
    raw: row,
  };
}

/**
 * Invalidate cached server state so every module refetches for the new workspace.
 * Avoids a full browser reload while forcing data to match the selection.
 */
export function invalidateWorkspaceQueries() {
  return queryClient.invalidateQueries({ refetchType: 'active' });
}

/**
 * @param {{ user: object|null, autoHydrate?: boolean }} args
 */
export default function useWorkspace({ user, autoHydrate = true } = {}) {
  const currentClientId = useCurrentClientId();
  const setCurrentClient = useAppStore((s) => s.setCurrentClient);
  const setWorkspaces = useAppStore((s) => s.setWorkspaces);
  const setWorkspacesLoading = useAppStore((s) => s.setWorkspacesLoading);
  const workspaces = useAppStore((s) => s.workspaces);
  const loading = useAppStore((s) => s.workspacesLoading);
  const fallbackId = user?.client_id || null;

  useEffect(() => {
    if (!autoHydrate) return undefined;
    let cancelled = false;

    async function load() {
      if (!user) {
        if (!cancelled) {
          setWorkspaces([]);
          setWorkspacesLoading(false);
        }
        return;
      }
      if (!cancelled) setWorkspacesLoading(true);
      try {
        const res = await clientsAPI.list({ skipWorkspace: true });
        if (cancelled) return;
        const list = res.data?.results || res.data || [];
        const rows = (Array.isArray(list) ? list : []).map(normalizeWorkspace).filter(Boolean);
        setWorkspaces(rows);

        const storeId = useAppStore.getState().currentClientId;
        const preferredId = storeId || fallbackId;
        const match = rows.find((w) => String(w.id) === String(preferredId)) || rows[0] || null;
        if (match && String(match.id) !== String(storeId)) {
          setCurrentClient(match);
        } else if (!match && storeId) {
          setCurrentClient(null);
        }
      } catch {
        if (!cancelled) setWorkspaces([]);
      } finally {
        if (!cancelled) setWorkspacesLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, fallbackId, setCurrentClient, setWorkspaces, setWorkspacesLoading, autoHydrate]);

  const workspaceId = currentClientId || fallbackId || null;

  const workspace = useMemo(() => {
    const found = workspaces.find((w) => String(w.id) === String(workspaceId));
    if (found) return found;
    const stored = useAppStore.getState().currentClient;
    if (stored && String(stored.id) === String(workspaceId)) {
      return typeof stored.label === 'string' ? stored : normalizeWorkspace(stored);
    }
    if (workspaceId) {
      return {
        id: workspaceId,
        label: `Workspace #${workspaceId}`,
        company: `Workspace #${workspaceId}`,
        name: `Workspace #${workspaceId}`,
        slug: null,
        initial: 'W',
        logo: null,
        raw: null,
      };
    }
    return null;
  }, [workspaces, workspaceId]);

  const switchWorkspace = useCallback(async (ws) => {
    if (!ws?.id) return;
    const normalized = typeof ws.label === 'string' ? ws : normalizeWorkspace(ws);
    const prev = useAppStore.getState().currentClientId;
    if (String(normalized.id) === String(prev)) return;

    setCurrentClient(normalized);
    await invalidateWorkspaceQueries();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workspace:changed', {
        detail: { workspaceId: normalized.id, workspace: normalized },
      }));
    }
  }, [setCurrentClient]);

  return {
    loading,
    workspaceId,
    workspace,
    workspaces,
    switchWorkspace,
    canSwitch: workspaces.length > 1,
  };
}
