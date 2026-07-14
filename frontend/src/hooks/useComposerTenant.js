/* ============================================================================
 * Resolve Multi-workspace & Teams context for the composer chrome.
 * Maps product concepts → existing models: Agency (org), Client (workspace).
 * ========================================================================== */
import { useEffect, useMemo, useState } from 'react';
import {
  clientsAPI, agencyAPI, invitationAPI, managementAPI,
} from '../services/api';

const ROLE_LABELS = {
  superadmin: 'Platform Superadmin',
  staff: 'Team Staff',
  client: 'Client collaborator',
};

const ACCOUNT_ROLE_LABELS = {
  end_user: 'Workspace owner',
  agency_member: 'Agency member',
  legacy: 'Member',
};

function initialFrom(name = '') {
  const t = String(name).trim();
  return t ? t[0].toUpperCase() : 'W';
}

/**
 * @param {{ user: object|null, can: (code: string) => boolean, isAdminShell: boolean }} args
 */
export default function useComposerTenant({ user, can, isAdminShell }) {
  const [workspace, setWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [staffCount, setStaffCount] = useState(null);
  const [loading, setLoading] = useState(true);

  const clientId = user?.client_id || null;
  const agencySlug = user?.primary_agency_slug || null;
  const canManageStaff = !!(user && (user.role === 'superadmin' || can?.('manage_staff')));
  const canSeeInvites = !!(isAdminShell || user?.role === 'superadmin' || user?.role === 'staff');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) setLoading(true);

      const tasks = [];

      if (clientId) {
        tasks.push(
          clientsAPI.get(clientId)
            .then((res) => { if (!cancelled) setWorkspace(res.data); })
            .catch(() => { if (!cancelled) setWorkspace(null); }),
        );
      } else if (!cancelled) {
        setWorkspace(null);
      }

      tasks.push(
        clientsAPI.list()
          .then((res) => {
            if (cancelled) return;
            const list = res.data?.results || res.data || [];
            setWorkspaces(Array.isArray(list) ? list : []);
          })
          .catch(() => { if (!cancelled) setWorkspaces([]); }),
      );

      if (agencySlug) {
        tasks.push(
          agencyAPI.get(agencySlug)
            .then((res) => { if (!cancelled) setOrganization(res.data); })
            .catch(() => { if (!cancelled) setOrganization(null); }),
        );
      } else if (!cancelled) {
        setOrganization(null);
      }

      if (canSeeInvites) {
        tasks.push(
          invitationAPI.mine()
            .then((res) => {
              if (cancelled) return;
              const rows = res.data?.results || res.data || [];
              const pending = (Array.isArray(rows) ? rows : [])
                .filter((i) => !i.accepted_at && i.status !== 'accepted' && i.status !== 'cancelled');
              setPendingInvites(pending.length);
            })
            .catch(() => { if (!cancelled) setPendingInvites(0); }),
        );
      }

      if (canManageStaff) {
        tasks.push(
          managementAPI.listStaff()
            .then((res) => {
              if (cancelled) return;
              const rows = res.data?.results || res.data || [];
              setStaffCount(Array.isArray(rows) ? rows.length : null);
            })
            .catch(() => { if (!cancelled) setStaffCount(null); }),
        );
      }

      await Promise.allSettled(tasks);
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [user, clientId, agencySlug, canSeeInvites, canManageStaff]);

  const roleLabel = useMemo(() => {
    if (!user?.role) return '';
    if (user.account_type && ACCOUNT_ROLE_LABELS[user.account_type]
      && user.role === 'client') {
      return ACCOUNT_ROLE_LABELS[user.account_type];
    }
    return ROLE_LABELS[user.role] || user.role;
  }, [user]);

  const orgLabel = useMemo(() => {
    if (organization?.name) return organization.name;
    if (agencySlug) return agencySlug;
    if (user?.role === 'superadmin') return 'Platform organization';
    if (user?.account_type === 'agency_member') return 'Agency organization';
    return 'Your organization';
  }, [organization, agencySlug, user]);

  const workspaceLabel = useMemo(() => {
    if (workspace?.company) return workspace.company;
    if (workspaces.find((w) => String(w.id) === String(clientId))?.company) {
      return workspaces.find((w) => String(w.id) === String(clientId)).company;
    }
    return clientId ? `Workspace #${clientId}` : 'No workspace selected';
  }, [workspace, workspaces, clientId]);

  const links = useMemo(() => {
    const settings = isAdminShell && clientId
      ? `/admin/client/${clientId}/settings`
      : isAdminShell
        ? '/admin/clients'
        : '/dashboard/settings';

    return {
      settings,
      workspaces: isAdminShell ? '/admin/clients' : '/dashboard/settings',
      members: isAdminShell ? '/admin/management' : '/dashboard/account-settings',
      invitations: isAdminShell ? '/admin/clients' : '/dashboard/settings',
      agency: user?.account_type === 'end_user' ? '/u/agency' : null,
    };
  }, [isAdminShell, clientId, user?.account_type]);

  const capabilities = useMemo(() => ([
    {
      id: 'rbac',
      title: 'Granular RBAC',
      detail: staffCount != null
        ? `${staffCount} staff with permission matrix`
        : 'Per-action permissions for team staff',
      to: links.members,
    },
    {
      id: 'roles',
      title: 'Custom roles',
      detail: 'Role defaults + per-user overrides',
      to: links.members,
    },
    {
      id: 'invites',
      title: 'Invitations',
      detail: pendingInvites
        ? `${pendingInvites} pending invite${pendingInvites === 1 ? '' : 's'}`
        : 'Invite clients & collaborators',
      to: links.invitations,
      badge: pendingInvites || null,
    },
    {
      id: 'client-role',
      title: 'Client collaborator',
      detail: 'External clients see only their workspace',
      to: links.agency || links.settings,
    },
  ]), [links, pendingInvites, staffCount]);

  return {
    loading,
    organization: {
      label: orgLabel,
      slug: agencySlug || organization?.slug || null,
      initial: initialFrom(orgLabel),
      logo: organization?.logo || null,
    },
    workspace: {
      id: clientId,
      label: workspaceLabel,
      initial: initialFrom(workspaceLabel),
      logo: workspace?.logo || workspace?.profile_image || null,
      raw: workspace,
    },
    workspaces: workspaces.map((w) => ({
      id: w.id,
      label: w.company || `Workspace #${w.id}`,
      initial: initialFrom(w.company),
      logo: w.logo || w.profile_image || null,
      active: String(w.id) === String(clientId),
    })),
    roleLabel,
    accountType: user?.account_type || null,
    pendingInvites,
    staffCount,
    links,
    capabilities,
    memberHint: user?.email
      ? `Signed in as ${user.first_name || user.email}`
      : 'Sign in to manage team access',
  };
}
