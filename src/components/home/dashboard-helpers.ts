// Pure helpers for the dashboard screen: the greeting, the client-side
// streak count and the sample-notes request body. No framework code, so
// every piece stays easy to read and test.

import type { AnalyzeRequest } from "@/lib/api-types";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import type { TopicProgress } from "@/lib/types";

// Good morning before noon, good afternoon until 5pm, good evening after.
export function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// UTC calendar day of an ISO timestamp, e.g. "2026-09-05".
function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The study streak, counted in the browser from the progress list: the
// number of consecutive UTC days with at least one practised topic, ending
// today, or yesterday when nothing has been practised yet today. Practising
// several topics on one day counts once, and a profile with no practice at
// all has a streak of 0.
export function computeStreak(progress: TopicProgress[], now: Date): number {
  const practisedDays = new Set<string>();
  for (const entry of progress) {
    if (!entry.lastAttemptAt) continue;
    const date = new Date(entry.lastAttemptAt);
    if (Number.isNaN(date.getTime())) continue;
    practisedDays.add(utcDay(date));
  }

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!practisedDays.has(utcDay(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (practisedDays.has(utcDay(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// The request body for "Try sample notes": the bundled sample notes, sent to
// /api/analyze like any other pasted text, flagged with sourceName "sample".
export function buildSampleRequest(): AnalyzeRequest {
  return {
    title: SAMPLE_NOTES.title,
    text: SAMPLE_NOTES.text,
    sourceName: "sample",
    pageCount: 0,
  };
}
