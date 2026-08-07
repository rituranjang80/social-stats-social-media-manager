import {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import PropTypes from 'prop-types';
import { postCalendarKey } from './utils';

const CalendarUiContext = createContext(null);

export function CalendarUiProvider({ children }) {
  const [pinnedByKey, setPinnedByKey] = useState(() => new Map());

  const isPostPinned = useCallback(
    (post) => pinnedByKey.has(postCalendarKey(post)),
    [pinnedByKey],
  );

  const setPostPinned = useCallback((post, pinned) => {
    const key = postCalendarKey(post);
    if (!key) return;
    setPinnedByKey((prev) => {
      const next = new Map(prev);
      if (pinned) next.set(key, post);
      else next.delete(key);
      return next;
    });
  }, []);

  const clearPinnedPosts = useCallback(() => {
    setPinnedByKey(new Map());
  }, []);

  const pinnedPosts = useMemo(
    () => Array.from(pinnedByKey.values()),
    [pinnedByKey],
  );

  const value = useMemo(() => ({
    pinnedPosts,
    isPostPinned,
    setPostPinned,
    clearPinnedPosts,
  }), [pinnedPosts, isPostPinned, setPostPinned, clearPinnedPosts]);

  return (
    <CalendarUiContext.Provider value={value}>
      {children}
    </CalendarUiContext.Provider>
  );
}

CalendarUiProvider.propTypes = {
  children: PropTypes.node,
};

export function useCalendarUi() {
  return useContext(CalendarUiContext);
}
