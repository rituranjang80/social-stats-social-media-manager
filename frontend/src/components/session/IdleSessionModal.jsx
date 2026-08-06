/* ============================================================================
 * Idle session warning — countdown + continue working.
 * ========================================================================== */
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Clock, ShieldAlert } from 'lucide-react';

import '../../styles/scss/session/_idle-session-modal.scss';

export default function IdleSessionModal({
  open,
  remainingLabel,
  remainingSeconds,
  warningMinutes,
  warningSeconds = 0,
  onContinue,
}) {
  const totalWarnSec = warningSeconds > 0
    ? warningSeconds
    : warningMinutes * 60;
  const progress = totalWarnSec > 0
    ? Math.min(1, Math.max(0, remainingSeconds / totalWarnSec))
    : 0;

  return (
    <Modal
      open={open}
      ariaLabel="Session expiring soon"
      size="sm"
      closeOnBackdrop={false}
      showClose={false}
      elevated
      className="idle-session-modal"
      overlayClassName="idle-session-modal__overlay"
      title={null}
      footer={(
        <div className="idle-session-modal__actions">
          <Button variant="primary" size="md" onClick={onContinue}>
            Continue working
          </Button>
        </div>
      )}
    >
      <div className="idle-session-modal__body">
        <div className="idle-session-modal__icon-wrap" aria-hidden>
          <ShieldAlert size={28} strokeWidth={2} />
        </div>
        <h2 className="idle-session-modal__heading">Still there?</h2>
        <p className="idle-session-modal__text">
          You have been inactive. For your security you will be signed out when the timer reaches zero.
        </p>
        <div className="idle-session-modal__timer" role="timer" aria-live="polite">
          <svg className="idle-session-modal__ring" viewBox="0 0 120 120">
            <circle className="idle-session-modal__ring-track" cx="60" cy="60" r="52" />
            <circle
              className="idle-session-modal__ring-progress"
              cx="60"
              cy="60"
              r="52"
              style={{ strokeDashoffset: `${328 * (1 - progress)}` }}
            />
          </svg>
          <div className="idle-session-modal__time">
            <Clock size={16} strokeWidth={2.2} aria-hidden />
            <span className="idle-session-modal__digits">{remainingLabel}</span>
          </div>
        </div>
        <p className="idle-session-modal__hint">
          Choose <strong>Continue working</strong> to stay signed in.
        </p>
      </div>
    </Modal>
  );
}
