/**
 * Shared “All = empty array” multi-select filter semantics for calendar dropdowns/legend.
 * `['__none__']` = parent off, all children off, filter matches nothing.
 */

export const MULTI_SELECT_NONE = '__none__';

export function isMultiSelectNone(selected) {
  return selected?.length === 1 && selected[0] === MULTI_SELECT_NONE;
}

export function selectNoneSelected() {
  return [MULTI_SELECT_NONE];
}

export function isShowingAllSelected(selected, allIds) {
  if (isMultiSelectNone(selected)) return false;
  const total = (allIds || []).length;
  if (!total) return true;
  if (!selected?.length) return true;
  const set = new Set(selected.filter((x) => x !== MULTI_SELECT_NONE));
  if (set.size >= total) return true;
  return false;
}

export function isMasterIndeterminate(selected, allIds) {
  if (isMultiSelectNone(selected)) return false;
  const total = (allIds || []).length;
  if (!total || !selected?.length) return false;
  if (isShowingAllSelected(selected, allIds)) return false;
  return true;
}

export function isMultiSelectChecked(id, selected, allIds) {
  if (isMultiSelectNone(selected)) return false;
  if (isShowingAllSelected(selected, allIds)) return true;
  return selected.includes(id);
}

export function clearMultiSelectAll() {
  return [];
}

export function toggleMultiSelectItem(id, selected, allIds) {
  const ids = allIds || [];
  if (isMultiSelectNone(selected)) {
    return [id];
  }
  if (isShowingAllSelected(selected, ids)) {
    return ids.filter((x) => x !== id);
  }
  if (selected.includes(id)) {
    const next = selected.filter((x) => x !== id);
    if (!next.length) return selectNoneSelected();
    return next;
  }
  const next = [...selected, id];
  if (ids.length && next.length >= ids.length) return clearMultiSelectAll();
  return next;
}

/** Prevent native label toggle fighting controlled checkboxes. */
export function multiSelectRowProps(onActivate) {
  return {
    onClick: (e) => {
      e.preventDefault();
      onActivate();
    },
    onKeyDown: (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Master row: all on → clear all children; otherwise select all (parent + children on). */
export function multiSelectMasterProps(allOn, onSelectAll, onClearAll) {
  return {
    onClick: (e) => {
      e.preventDefault();
      if (allOn) onClearAll?.();
      else onSelectAll?.();
    },
    onKeyDown: (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (allOn) onClearAll?.();
        else onSelectAll?.();
      }
    },
  };
}
