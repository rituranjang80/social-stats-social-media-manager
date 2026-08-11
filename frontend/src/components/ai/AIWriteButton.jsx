/* ============================================================================
 *  Opens the centered AIWriteModal from composer caption card.
 * ========================================================================== */
import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import Button from '../ui/Button';
import AIWriteModal from './AIWriteModal';
import { useAuth } from '../../hooks/useAuth';

export default function AIWriteButton({
  clientId,
  platform = 'instagram',
  onInsert,
  label = 'Write with AI',
  size = 'sm',
}) {
  const [open, setOpen] = useState(false);
  const { can } = useAuth();
  const canCompose = can('ai.compose');

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        icon={Sparkles}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{ color: 'var(--brand-primary-hover)', fontWeight: 600 }}
        title={canCompose ? 'Generate text, image, or video content with AI' : 'AI compose permission required'}
      >
        {label}
      </Button>

      <AIWriteModal
        open={open}
        onClose={() => setOpen(false)}
        clientId={clientId}
        platform={platform}
        onInsert={onInsert}
        canCompose={canCompose}
      />
    </>
  );
}
