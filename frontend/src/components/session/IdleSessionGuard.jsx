/* ============================================================================
 * Mounts idle-session monitoring for authenticated users.
 * ========================================================================== */
import sessionIdleConfig from '../../config/sessionIdle';
import { useAuth } from '../../hooks/useAuth';
import useIdleSession from '../../hooks/useIdleSession';
import IdleSessionModal from './IdleSessionModal';

export default function IdleSessionGuard() {
  const { user, loading, logout } = useAuth();
  const active = !loading && !!user;

  const {
    warningOpen,
    remainingLabel,
    remainingSeconds,
    warningMinutes,
    warningSeconds,
    continueWorking,
  } = useIdleSession({
    active,
    onLogout: logout,
  });

  if (!sessionIdleConfig.enabled || !active) return null;

  return (
    <IdleSessionModal
      open={warningOpen}
      remainingLabel={remainingLabel}
      remainingSeconds={remainingSeconds}
      warningMinutes={warningMinutes}
      warningSeconds={warningSeconds}
      onContinue={continueWorking}
    />
  );
}
