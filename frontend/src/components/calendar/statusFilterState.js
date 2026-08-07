import { CAL_STATUS_FILTERS, statusMatchesFilter } from './statusTheme';
import {
  clearMultiSelectAll,
  isMultiSelectChecked,
  isShowingAllSelected,
  toggleMultiSelectItem,
} from './multiSelectFilterState';

export function allStatusIds() {
  return CAL_STATUS_FILTERS.map((f) => f.id);
}

export function isShowingAllStatuses(selected) {
  return isShowingAllSelected(selected, allStatusIds());
}

export function isStatusChecked(id, selected) {
  return isMultiSelectChecked(id, selected, allStatusIds());
}

export function statusPassesFilter(rawStatus, selected) {
  if (isShowingAllStatuses(selected)) return true;
  return statusMatchesFilter(rawStatus, selected);
}

export function selectAllStatuses() {
  return clearMultiSelectAll();
}

export function toggleStatusCheck(id, selected) {
  return toggleMultiSelectItem(id, selected, allStatusIds());
}
