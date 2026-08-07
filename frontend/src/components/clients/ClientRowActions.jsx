import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pencil, Trash2, Mail, Power, PowerOff, LayoutDashboard, RefreshCw,
} from 'lucide-react';

import Button from '../ui/Button';
import toast from '../ui/toast';
import { clientsAPI } from '../../services/api';
import { confirmDialog } from '../../services/dialog';
import { clientWorkspacePath } from '../../utils/workspacePaths';

import '../../styles/scss/pages/_client-row-actions.scss';

export default function ClientRowActions({ client, onChanged, onSync, syncingId }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');

  const run = async (key, fn, successMsg) => {
    setBusy(key);
    try {
      await fn();
      toast.success(successMsg);
      onChanged?.();
    } catch (e) {
      const data = e?.response?.data;
      toast.error(data?.error || 'Action failed');
      if (data?.error_log_id) {
        toast.error(`Error log: ${data.error_log_id}`);
      }
    } finally {
      setBusy('');
    }
  };

  const onDelete = async () => {
    const ok = await confirmDialog({
      type: 'delete',
      title: 'Remove workspace',
      message: `Remove workspace "${client.company}"? This soft-deletes the client and disables login.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    run('delete', () => clientsAPI.delete(client.id), 'Client removed');
  };

  return (
    <div className="client-row-actions">
      <Button
        size="sm"
        variant="ghost"
        icon={LayoutDashboard}
        disabled={!!busy}
        onClick={() => navigate(clientWorkspacePath('/admin', client))}
        aria-label="Open workspace"
      >
        Open
      </Button>
      {onSync && (
        <Button
          size="sm"
          variant="ghost"
          icon={RefreshCw}
          disabled={!!busy || syncingId === client.id}
          loading={syncingId === client.id}
          onClick={() => onSync(client.id)}
          aria-label="Sync"
        >
          Sync
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        icon={Pencil}
        disabled={!!busy}
        onClick={() => navigate(clientWorkspacePath('/admin', client, 'settings'))}
        aria-label="Edit"
      >
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={Mail}
        disabled={!!busy}
        loading={busy === 'resend'}
        onClick={() => run(
          'resend',
          () => clientsAPI.resendInvitation(client.id),
          'Invitation email sent',
        )}
      >
        Resend
      </Button>
      {client.is_active !== false ? (
        <Button
          size="sm"
          variant="ghost"
          icon={PowerOff}
          disabled={!!busy}
          loading={busy === 'deactivate'}
          onClick={() => run(
            'deactivate',
            () => clientsAPI.deactivate(client.id),
            'Client deactivated',
          )}
        >
          Deactivate
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          icon={Power}
          disabled={!!busy}
          loading={busy === 'activate'}
          onClick={() => run(
            'activate',
            () => clientsAPI.activate(client.id),
            'Client activated',
          )}
        >
          Activate
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        icon={Trash2}
        disabled={!!busy}
        loading={busy === 'delete'}
        onClick={onDelete}
        aria-label="Delete"
      >
        Delete
      </Button>
    </div>
  );
}
