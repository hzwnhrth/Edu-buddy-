// Small formatting helpers shared by every screen. Plain functions, no
// framework dependency, safe to call from server or client code.

// formatPercent(0.734) -> "73%"
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

// A short, readable date and time in the viewer's own locale, e.g.
// "4 Sept 2026, 14:05" (the exact punctuation depends on the browser locale).
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

// "just now", "5 minutes ago", "2 hours ago", "3 days ago", or (beyond a
// week) a short date such as "12 Aug 2026". Falls back to the short date for
// timestamps in the future too, so a clock skew never prints a negative time.
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();

  if (diffMs < MINUTE) {
    return diffMs < 0 ? shortDate(date) : "just now";
  }
  if (diffMs < HOUR) {
    return pluralize(Math.floor(diffMs / MINUTE), "minute") + " ago";
  }
  if (diffMs < DAY) {
    return pluralize(Math.floor(diffMs / HOUR), "hour") + " ago";
  }
  if (diffMs < WEEK) {
    return pluralize(Math.floor(diffMs / DAY), "day") + " ago";
  }
  return shortDate(date);
}

function shortDate(date: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

// pluralize(5, "topic") -> "5 topics"; pluralize(1, "topic") -> "1 topic";
// pluralize(2, "quiz", "quizzes") -> "2 quizzes".
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word}`;
}
