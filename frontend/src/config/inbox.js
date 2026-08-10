/* Inbox UI config — reads REACT_APP_INBOX_* from .env (see CONFIGURATION.md). */

function envInt(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Default conversation list range when the page loads (days back from today). */
export const INBOX_DEFAULT_RANGE_DAYS = envInt('REACT_APP_INBOX_DEFAULT_DAYS', 30);

/** Conversation type filter ids (labels only; icons mapped in the page). */
export const INBOX_CONVERSATION_TYPES = [
  { id: '', label: 'All' },
  { id: 'comment', label: 'Comments' },
  { id: 'dm', label: 'DMs' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review', label: 'Reviews' },
];

/** Sentiment filter ids for sidebar. */
export const INBOX_SENTIMENT_FILTERS = [
  { id: '', label: 'All' },
  { id: 'positive', label: 'Positive' },
  { id: 'neutral', label: 'Neutral' },
  { id: 'negative', label: 'Negative' },
];
