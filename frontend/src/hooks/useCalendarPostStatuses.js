import { useEffect, useState } from 'react';
import { calendarAPI } from '../services/api';
import { setActiveStatusFilters, CAL_STATUS_FILTERS } from '../components/calendar/statusTheme';

export function useCalendarPostStatuses() {
  const [filters, setFilters] = useState(CAL_STATUS_FILTERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    calendarAPI.getPostStatuses()
      .then((res) => {
        if (cancelled) return;
        const next = res.data?.filters;
        if (Array.isArray(next) && next.length) {
          setFilters(next);
          setActiveStatusFilters(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilters(CAL_STATUS_FILTERS);
          setActiveStatusFilters(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { filters, loading };
}
