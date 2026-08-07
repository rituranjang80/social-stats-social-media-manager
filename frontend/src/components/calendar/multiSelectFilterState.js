/**
 * Shared “All = empty array” multi-select filter semantics for calendar dropdowns/legend.
 */

export function isShowingAllSelected(selected, allIds) {
  const total = (allIds || []).length;
  if (!total) return true;
  if (!selected?.length) return true;
  if (selected.length >= total) return true;
  return false;
}

export function isMultiSelectChecked(id, selected, allIds) {
  if (isShowingAllSelected(selected, allIds)) return true;
  return selected.includes(id);
}

export function clearMultiSelectAll() {
  return [];
}

export function toggleMultiSelectItem(id, selected, allIds) {
  const ids = allIds || [];
  if (isShowingAllSelected(selected, ids)) {
    return ids.filter((x) => x !== id);
  }
  if (selected.includes(id)) {
    const next = selected.filter((x) => x !== id);
    return next.length ? next : [];
  }
  const next = [...selected, id];
  if (ids.length && next.length >= ids.length) return [];
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

export function multiSelectMasterProps(allOn, onSelectAll) {
  return {
    onClick: (e) => {
      e.preventDefault();
      if (!allOn) onSelectAll();
    },
    onKeyDown: (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !allOn) {
        e.preventDefault();
        onSelectAll();
      }
    },
  };
}
