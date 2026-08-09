/* ============================================================================
 *  usePostManagement — upcoming posts via post-management API (feature-gated).
 * ========================================================================== */
import { useCallback, useEffect, useState } from 'react';
import { postManagementAPI } from '../services/api';
import { mapLegacyCalendarPost } from '../components/calendar/utils';

function normalizeMap(data) {
  const out = {};
  Object.entries(data || {}).forEach(([date, list]) => {
    out[date] = (list || []).map((p) => (
      p.source === 'composer' ? p : mapLegacyCalendarPost(p)
    ));
  });
  return out;
}

export function usePostManagementSettings(clientId) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) {
      setSettings(null);
      return;
    }
    setLoading(true);
    try {
      const res = await postManagementAPI.getSettings({ client_id: clientId });
      setSettings(res.data);
    } catch {
      setSettings({ enabled: false, can_view: false, can_configure: false });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveEnabled = useCallback(async (enabled) => {
    const res = await postManagementAPI.saveSettings({ client_id: clientId, enabled });
    setSettings(res.data);
    return res.data;
  }, [clientId]);

  return { settings, loading, refetch: load, saveEnabled };
}

export function usePostManagementPosts(clientId, dateFrom, dateTo) {
  const [postsByDate, setPostsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    if (!clientId || !dateFrom || !dateTo) {
      setPostsByDate({});
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await postManagementAPI.getPosts({
        client_id: clientId,
        date_from: dateFrom,
        date_to: dateTo,
      });
      setPostsByDate(normalizeMap(res.data));
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to load posts.';
      setError(msg);
      setPostsByDate({});
    } finally {
      setLoading(false);
    }
  }, [clientId, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);

  return { postsByDate, loading, error, refetch: fetch };
}
