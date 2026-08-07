/**
 * Imperative Interactive Dialog API — use DialogHost (mounted in App.js).
 *
 * Prefer confirmDialog / alertDialog / promptDialog for common flows.
 * Use showDialog for custom footers, React content, loading/progress, and dialog types.
 */
let hostRef = null;

export function bindDialogHost(host) {
  hostRef = host;
}

/**
 * @param {object} options
 * @returns {Promise<{ buttonId: string|null, value?: string }|null>}
 */
export function showDialog(options) {
  return new Promise((resolve) => {
    if (!hostRef?.open) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[dialog] DialogHost is not mounted');
      }
      resolve(null);
      return;
    }
    hostRef.open({ ...options, _resolve: resolve });
  });
}

export async function confirmDialog({
  title = 'Confirm',
  subtitle,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  type,
  danger = false,
  size = 'sm',
  closeOnOverlay = true,
  closeOnEsc = true,
} = {}) {
  const result = await showDialog({
    type: type || (danger ? 'delete' : 'question'),
    title,
    subtitle,
    message,
    size,
    closeOnOverlay,
    closeOnEsc,
    buttons: [
      { id: 'cancel', label: cancelLabel, variant: 'secondary' },
      {
        id: 'confirm',
        label: confirmLabel,
        variant: danger ? 'danger' : 'primary',
        primary: true,
      },
    ],
  });
  return result?.buttonId === 'confirm';
}

export async function alertDialog({
  title = 'Notice',
  subtitle,
  message,
  type = 'info',
  confirmLabel = 'OK',
  size = 'sm',
  closeOnOverlay = true,
  closeOnEsc = true,
} = {}) {
  await showDialog({
    type,
    title,
    subtitle,
    message,
    size,
    closeOnOverlay,
    closeOnEsc,
    buttons: [{ id: 'ok', label: confirmLabel, variant: 'primary', primary: true }],
  });
}

/**
 * @returns {Promise<string|null>} Input value, or null if cancelled
 */
export async function promptDialog({
  title = 'Input required',
  subtitle,
  message,
  defaultValue = '',
  placeholder = '',
  inputLabel = '',
  multiline = false,
  inputType = 'text',
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  type = 'question',
  size = 'sm',
  closeOnOverlay = true,
  closeOnEsc = true,
} = {}) {
  const result = await showDialog({
    type,
    title,
    subtitle,
    message,
    size,
    closeOnOverlay,
    closeOnEsc,
    prompt: {
      defaultValue,
      placeholder,
      label: inputLabel,
      multiline,
      inputType,
    },
    buttons: [
      { id: 'cancel', label: cancelLabel, variant: 'secondary' },
      { id: 'confirm', label: confirmLabel, variant: 'primary', primary: true },
    ],
  });
  if (!result || result.buttonId !== 'confirm') return null;
  return result.value ?? '';
}
