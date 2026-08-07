/* ============================================================================
 * DialogHost — lazy imperative dialog root (bindDialogHost in services/dialog.js)
 * ========================================================================== */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { bindDialogHost } from '../../services/dialog';

const InteractiveDialog = lazy(() => import('./InteractiveDialog'));

const CLOSE_MS = 180;

export default function DialogHost() {
  const [session, setSession] = useState(null);
  const [closing, setClosing] = useState(false);
  const resolveRef = useRef(null);
  const closeTimerRef = useRef(null);

  const dismiss = useCallback((result) => {
    if (!session) return;
    setClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      resolveRef.current?.(result);
      resolveRef.current = null;
      setSession(null);
      setClosing(false);
    }, CLOSE_MS);
  }, [session]);

  const open = useCallback((options) => {
    clearTimeout(closeTimerRef.current);
    setClosing(false);
    resolveRef.current = options._resolve;
    const { _resolve, ...rest } = options;
    setSession(rest);
  }, []);

  useEffect(() => {
    bindDialogHost({ open });
    return () => {
      bindDialogHost(null);
      clearTimeout(closeTimerRef.current);
    };
  }, [open]);

  const handleButton = useCallback(({ buttonId, value }) => {
    dismiss({ buttonId, value });
  }, [dismiss]);

  if (!session && !closing) return null;

  return (
    <Suspense fallback={null}>
      <InteractiveDialog
        open={Boolean(session)}
        closing={closing}
        {...(session || {})}
        onButton={handleButton}
        onClose={() => dismiss({ buttonId: null, value: null })}
      />
    </Suspense>
  );
}
