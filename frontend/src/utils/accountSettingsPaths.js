/** Return URL for Account settings → More settings tab. */
export function getAccountSettingsHref(role, tab = 'more') {
  const base = role === 'client' ? '/dashboard' : '/admin';
  const q = tab ? `?tab=${encodeURIComponent(tab)}` : '';
  return `${base}/account-settings${q}`;
}
