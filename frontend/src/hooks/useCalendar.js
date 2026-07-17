/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import { useState, useEffect, useCallback, useRef } from 'react';
import { calendarAPI, composerAPI } from '../services/api';
import {
  groupComposerPostsByDate,
  mergePostsByDate,
  mapLegacyCalendarPost,
} from '../components/calendar/utils';

async function fetchAllComposerPosts(clientId) {
  const rows = [];
  let page = 1;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    const res = await composerAPI.posts.list({
      client_id: clientId,
      page,
    });
    const payload = res.data;
    const batch = payload?.results || (Array.isArray(payload) ? payload : []);
    rows.push(...batch);
    if (!payload?.next || !batch.length) break;
    page += 1;
  }
  return rows;
}

function normalizeCalendarMap(data) {
  const out = {};
  Object.entries(data || {}).forEach(([date, list]) => {
    out[date] = (list || []).map(mapLegacyCalendarPost);
  });
  return out;
}

// ── useCalendarPosts ───────────────────────────────────────────────────────────
export function useCalendarPosts(clientId, month, year) {
  const [postsByDate, setPostsByDate] = useState({});
  const [loading,    setLoading]     = useState(false);
  const [error,      setError]       = useState('');

  const fetch = useCallback(async () => {
    if (!clientId) {
      setPostsByDate({});
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = { client_id: clientId, month, year };
      const [calRes, composerRows] = await Promise.all([
        calendarAPI.getPosts(params),
        fetchAllComposerPosts(clientId).catch(() => []),
      ]);
      const calendarMap = normalizeCalendarMap(calRes.data || {});
      const composerMap = groupComposerPostsByDate(composerRows, month, year);
      setPostsByDate(mergePostsByDate(calendarMap, composerMap));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load calendar posts.');
      setPostsByDate({});
    } finally {
      setLoading(false);
    }
  }, [clientId, month, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const getPostsForDate = useCallback(
    (dateStr) => postsByDate[dateStr] || [],
    [postsByDate]
  );

  return { postsByDate, loading, error, refetch: fetch, getPostsForDate };
}

// ── useCalendarStats ───────────────────────────────────────────────────────────
export function useCalendarStats(clientId, month, year) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    calendarAPI.getStats({ client_id: clientId, month, year })
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [clientId, month, year]);

  return { stats, loading };
}

// ── useUpcomingPosts ───────────────────────────────────────────────────────────
export function useUpcomingPosts(clientId) {
  const [upcoming, setUpcoming] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const intervalRef = useRef(null);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const params = clientId ? { client_id: clientId } : {};
      const res = await calendarAPI.getUpcoming(params);
      setUpcoming(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetch();
    intervalRef.current = setInterval(fetch, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(intervalRef.current);
  }, [fetch]);

  return { upcoming, loading, refetch: fetch };
}

// ── useCreatePost ──────────────────────────────────────────────────────────────
export function useCreatePost() {
  const [creating, setCreating] = useState(false);
  const [error,    setError]    = useState('');

  const create = useCallback(async (data) => {
    setCreating(true);
    setError('');
    try {
      const res = await calendarAPI.createPost(data);
      return { success: true, post: res.data };
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to create post.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setCreating(false);
    }
  }, []);

  const update = useCallback(async (id, data) => {
    setCreating(true);
    setError('');
    try {
      const res = await calendarAPI.updatePost(id, data);
      return { success: true, post: res.data };
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to update post.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setCreating(false);
    }
  }, []);

  const remove = useCallback(async (id, { source = 'calendar' } = {}) => {
    setCreating(true);
    setError('');
    try {
      if (source === 'composer') {
        await composerAPI.posts.delete(id);
      } else {
        await calendarAPI.deletePost(id);
      }
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || 'Failed to delete post.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setCreating(false);
    }
  }, []);

  const reschedule = useCallback(async (id, datetime, { source = 'calendar', clientId } = {}) => {
    setCreating(true);
    setError('');
    try {
      if (source === 'composer') {
        const params = clientId ? { client_id: clientId } : undefined;
        const res = await composerAPI.posts.schedule(id, datetime, params);
        return { success: true, post: { ...res.data, source: 'composer', calendarKey: `composer-${id}` } };
      }
      const res = await calendarAPI.reschedule(id, { scheduled_at: datetime });
      return { success: true, post: res.data };
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || 'Failed to reschedule.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setCreating(false);
    }
  }, []);

  return { creating, error, create, update, remove, reschedule };
}

// ── useCalendarNotes ───────────────────────────────────────────────────────────
export function useCalendarNotes(clientId, month, year) {
  const [notes,       setNotes]       = useState([]);
  const [notesByDate, setNotesByDate] = useState({});
  const [loading,     setLoading]     = useState(false);

  const fetch = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await calendarAPI.getNotes({ client_id: clientId, month, year });
      const data = res.data || [];
      setNotes(data);
      const byDate = {};
      data.forEach(note => {
        const key = note.date;
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(note);
      });
      setNotesByDate(byDate);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [clientId, month, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const createNote = useCallback(async (data) => {
    try {
      const res = await calendarAPI.createNote(data);
      await fetch();
      return { success: true, note: res.data };
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to create note.';
      return { success: false, error: msg };
    }
  }, [fetch]);

  const deleteNote = useCallback(async (id) => {
    try {
      await calendarAPI.deleteNote(id);
      await fetch();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || 'Failed to delete note.' };
    }
  }, [fetch]);

  return { notes, notesByDate, loading, createNote, deleteNote, refetch: fetch };
}

// ── useSuggestedTimes ──────────────────────────────────────────────────────────
export function useSuggestedTimes(clientId, platform) {
  const [suggestions, setSuggestions] = useState([]);
  const [source,      setSource]      = useState('industry');
  const [loading,     setLoading]     = useState(false);

  useEffect(() => {
    if (!clientId || !platform) return;
    setLoading(true);
    calendarAPI.suggestTimes({ client_id: clientId, platform })
      .then(res => {
        setSuggestions(res.data.suggestions || []);
        setSource(res.data.source || 'industry');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId, platform]);

  return { suggestions, source, loading };
}
