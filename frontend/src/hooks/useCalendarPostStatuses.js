import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { calendarAPI } from '../services/api';
import { setActiveStatusFilters, CAL_STATUS_FILTERS } from '../components/calendar/statusTheme';
import { defaultListTabId, listTabIds } from '../components/calendar/publishListConfig';

const PublishCalendarConfigContext = createContext(null);

function applyConfigPayload(data, { setFilters, setListTabs, setApprovalPills, setConfigError }) {
  const payload = data || {};
  const nextFilters = payload.filters;
  if (Array.isArray(nextFilters) && nextFilters.length) {
    setFilters(nextFilters);
    setActiveStatusFilters(nextFilters);
  }
  const tabs = Array.isArray(payload.list_tabs) ? payload.list_tabs : [];
  const pills = Array.isArray(payload.approval_pills) ? payload.approval_pills : [];
  setListTabs(tabs);
  setApprovalPills(pills);
  if (!tabs.length) {
    setConfigError('Publish list tabs could not be loaded from the server.');
  } else {
    setConfigError('');
  }
}

export function PublishCalendarConfigProvider({ children }) {
  const [filters, setFilters] = useState(CAL_STATUS_FILTERS);
  const [listTabs, setListTabs] = useState([]);
  const [approvalPills, setApprovalPills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await calendarAPI.getPostStatuses();
      applyConfigPayload(res.data, {
        setFilters,
        setListTabs,
        setApprovalPills,
        setConfigError,
      });
    } catch {
      setFilters(CAL_STATUS_FILTERS);
      setActiveStatusFilters(null);
      setListTabs([]);
      setApprovalPills([]);
      setConfigError('Could not load publish filters. Check your connection and sign-in.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabIds = useMemo(() => listTabIds(listTabs), [listTabs]);
  const defaultTabId = useMemo(() => defaultListTabId(listTabs), [listTabs]);

  const value = useMemo(() => ({
    filters,
    listTabs,
    approvalPills,
    tabIds,
    defaultTabId,
    loading,
    configError,
    refetchConfig: load,
  }), [filters, listTabs, approvalPills, tabIds, defaultTabId, loading, configError, load]);

  return (
    <PublishCalendarConfigContext.Provider value={value}>
      {children}
    </PublishCalendarConfigContext.Provider>
  );
}

export function usePublishCalendarConfig() {
  const ctx = useContext(PublishCalendarConfigContext);
  if (!ctx) {
    throw new Error('usePublishCalendarConfig must be used within PublishCalendarConfigProvider');
  }
  return ctx;
}

/** @deprecated use usePublishCalendarConfig */
export function useCalendarPostStatuses() {
  return usePublishCalendarConfig();
}
