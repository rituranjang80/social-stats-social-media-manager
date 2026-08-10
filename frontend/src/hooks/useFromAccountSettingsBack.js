import { useLocation } from 'react-router-dom';
import { useAccountSettingsBackHref } from './useAccountSettingsBackHref';

/** When user opened this page from Account settings → More settings, return back URL. */
export function useFromAccountSettingsBack(tab = 'more') {
  const location = useLocation();
  const href = useAccountSettingsBackHref(tab);
  return location.state?.fromAccountSettings ? href : undefined;
}
