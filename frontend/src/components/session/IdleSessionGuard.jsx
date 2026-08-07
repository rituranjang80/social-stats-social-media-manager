/* ============================================================================
 * Mounts idle-session monitoring for authenticated users.
 * ========================================================================== */
import { useAuth } from '../../hooks/useAuth';
import useIdleSession from '../../hooks/useIdleSession';
import IdleSessionModal from './IdleSessionModal';

export default function IdleSessionGuard() {
  const { user, loading, logout } = useAuth();
  const active = !loading && !!user;

  const {
    enabled,
    warningOpen,
    remainingLabel,
    remainingSeconds,
    warningMinutes,
    continueWorking,
  } = useIdleSession({
    active,
    onLogout: logout,
  });

  if (!enabled) return null;

  return (
    <IdleSessionModal
      open={warningOpen}
      remainingLabel={remainingLabel}
      remainingSeconds={remainingSeconds}
      warningMinutes={warningMinutes}
      onContinue={continueWorking}
    />
  );
}
