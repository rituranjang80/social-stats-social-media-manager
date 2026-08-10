import { useAuth } from './useAuth';
import { getAccountSettingsHref } from '../utils/accountSettingsPaths';

export function useAccountSettingsBackHref(tab = 'more') {
  const { user } = useAuth();
  return getAccountSettingsHref(user?.role, tab);
}
