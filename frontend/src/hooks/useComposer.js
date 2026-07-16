/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useCallback, useEffect, useState } from 'react';
import { composerAPI } from '../services/api';

/* ── Posts ─────────────────────────────────────────────────────── */
export function useComposerPosts(params) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await composerAPI.posts.list(params);
      setData(res.data?.results || res.data || []);
      setError(null);
    } catch (e) { setError(e); }
    finally    { setLoading(false); }
  // eslint-disable-next-line
  }, [JSON.stringify(params || {})]);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, error, refetch };
}

export function useComposerPost(id) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!id) { setData(null); return; }
    try {
      setLoading(true);
      const res = await composerAPI.posts.get(id);
      setData(res.data);
      setError(null);
    } catch (e) { setError(e); }
    finally    { setLoading(false); }
  }, [id]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, error, refetch };
}

/* ── Media ─────────────────────────────────────────────────────── */
export function useMediaAssets(params, options = {}) {
  const { paginate = false } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const paramsKey = JSON.stringify(params || {});

  const fetchPage = useCallback(async (pageNum, { append } = {}) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const parsed = JSON.parse(paramsKey || '{}');
      const res = await composerAPI.media.list({
        ...parsed,
        ...(paginate ? { page: pageNum } : {}),
      });

      const payload = res.data;
      const rows = payload?.results || (Array.isArray(payload) ? payload : []);
      const next = Boolean(payload?.next);

      setData((cur) => (append ? [...cur, ...rows] : rows));
      setHasMore(paginate ? next : false);
      setPage(pageNum);
      setError(null);
    } catch (e) {
      setError(e);
      if (!append) setData([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [paramsKey, paginate]);

  const refetch = useCallback(async () => {
    await fetchPage(1, { append: false });
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!paginate || loading || loadingMore || !hasMore) return;
    fetchPage(page + 1, { append: true });
  }, [paginate, loading, loadingMore, hasMore, page, fetchPage]);

  useEffect(() => { refetch(); }, [refetch]);

  return {
    data,
    loading,
    loadingMore,
    error,
    refetch,
    hasMore,
    loadMore,
  };
}

/* ── Queues ────────────────────────────────────────────────────── */
export function usePostQueues() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await composerAPI.queues.list();
      setData(res.data?.results || res.data || []);
      setError(null);
    } catch (e) { setError(e); }
    finally    { setLoading(false); }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, error, refetch };
}
