// Pure logic for the dashboard's "Review today" queue: which topics need
// attention right now, and why. No side effects and no imports beyond types
// and constants, so this stays trivial to reason about and safe to import
// from both the dashboard component and, later, a test.

import { REVIEW_STALE_DAYS } from "@/lib/constants";
import type { TopicProgress } from "@/lib/types";

export interface ReviewItem {
  topicId: string;
  materialId: string;
  name: string;
  reason: "weak" | "stale";
  mastery: number;
  attempts: number;
  lastAttemptAt: string | null;
  daysSince: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days elapsed between an ISO timestamp and `now`. Floors rather than
// rounds, so "3 days ago" means a full 3*24 hours have actually passed.
function daysSince(iso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / MS_PER_DAY);
}

// Builds the dashboard's "Review today" queue from a profile's progress
// list: weak topics first (lowest mastery first, then by name), then topics
// that are not weak but are due for review, i.e. never attempted or last
// attempted at least REVIEW_STALE_DAYS days ago (never attempted counts as
// the oldest, then oldest first). Every topic appears at most once, and the
// result never has more than `limit` items.
export function buildReviewQueue(
  progress: TopicProgress[],
  now: Date,
  limit = 5
): ReviewItem[] {
  const weakItems = progress
    .filter((topic) => topic.weak)
    .sort((a, b) => a.mastery - b.mastery || a.name.localeCompare(b.name))
    .map((topic) => toReviewItem(topic, "weak", now));

  const staleItems = progress
    .filter((topic) => !topic.weak)
    .filter((topic) => topic.lastAttemptAt === null || daysSince(topic.lastAttemptAt, now) >= REVIEW_STALE_DAYS)
    .sort((a, b) => {
      // A topic never attempted is treated as older than any dated one.
      if (a.lastAttemptAt === null || b.lastAttemptAt === null) {
        if (a.lastAttemptAt === null && b.lastAttemptAt === null) return 0;
        return a.lastAttemptAt === null ? -1 : 1;
      }
      return daysSince(b.lastAttemptAt, now) - daysSince(a.lastAttemptAt, now);
    })
    .map((topic) => toReviewItem(topic, "stale", now));

  return [...weakItems, ...staleItems].slice(0, limit);
}

function toReviewItem(topic: TopicProgress, reason: ReviewItem["reason"], now: Date): ReviewItem {
  return {
    topicId: topic.topicId,
    materialId: topic.materialId,
    name: topic.name,
    reason,
    mastery: topic.mastery,
    attempts: topic.attempts,
    lastAttemptAt: topic.lastAttemptAt,
    daysSince: topic.lastAttemptAt === null ? null : daysSince(topic.lastAttemptAt, now),
  };
}
