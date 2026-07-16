/* ============================================================================
 * MediaPickerModal — reusable library picker (composer and other modules).
 * Lazy-load this component from call sites.
 * ========================================================================== */
import { useCallback, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import MediaLibraryBody from './MediaLibraryBody';

import '../../styles/scss/media-picker.scss';

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {(assets: object[]) => void} onSelect
 * @param {boolean} multiple
 * @param {number[]} excludeIds
 * @param {string} title
 */
export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  multiple = true,
  excludeIds = [],
  title = 'Media Library',
  description = 'Choose media to attach. Already-added items are marked.',
}) {
  const [selectionCount, setSelectionCount] = useState(0);

  const handleConfirm = useCallback((assets) => {
    if (!assets?.length) return;
    onSelect?.(assets);
    onClose?.();
  }, [onSelect, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="xl"
      closeOnBackdrop
      draggable
      elevated
      overlayClassName="media-picker-overlay"
      className="media-picker-dialog"
      footer={multiple ? (
        <div className="media-picker__footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <span className="media-picker__footer-hint" aria-live="polite">
            {selectionCount
              ? `${selectionCount} selected — use Add in the toolbar, or double-click a tile`
              : 'Click tiles to multi-select, or double-click to add one · Drag header to move'}
          </span>
        </div>
      ) : (
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
      )}
    >
      <div className="media-picker">
        {open ? (
          <MediaLibraryBody
            mode="picker"
            selectionMode={multiple ? 'multiple' : 'single'}
            excludeIds={excludeIds}
            onConfirm={handleConfirm}
            onSelectionChange={setSelectionCount}
            showUpload
          />
        ) : null}
      </div>
    </Modal>
  );
}
