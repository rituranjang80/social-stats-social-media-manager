import { getActiveStatusFilters, statusMatchesFilter } from './statusTheme';
import {
  clearMultiSelectAll,
  isMultiSelectChecked,
  isMultiSelectNone,
  isShowingAllSelected,
  selectNoneSelected,
  toggleMultiSelectItem,
} from './multiSelectFilterState';

export function allStatusIds() {
  return getActiveStatusFilters().map((f) => f.id);
}

export function isShowingAllStatuses(selected) {
  return isShowingAllSelected(selected, allStatusIds());
}

export function isStatusChecked(id, selected) {
  return isMultiSelectChecked(id, selected, allStatusIds());
}

export function statusPassesFilter(rawStatus, selected) {
  if (isMultiSelectNone(selected)) return false;
  if (isShowingAllStatuses(selected)) return true;
  return statusMatchesFilter(rawStatus, selected);
}

export function selectAllStatuses() {
  return clearMultiSelectAll();
}

export function selectNoStatuses() {
  return selectNoneSelected();
}

export function toggleStatusCheck(id, selected) {
  return toggleMultiSelectItem(id, selected, allStatusIds());
}
