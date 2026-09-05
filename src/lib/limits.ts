import { getEnv } from "@/lib/env";
import type { Store } from "@/lib/store/types";
import type { Profile } from "@/lib/types";

// Hard ceilings shared by the upload, quiz and other request handlers, kept
// in the client-safe src/lib/constants.ts and re-exported here so every
// existing import from "@/lib/limits" keeps working unchanged.
export { MAX_TEXT_CHARS, MAX_TITLE_CHARS, MAX_QUIZ_QUESTIONS, MAX_SOURCE_NAME_CHARS } from "@/lib/constants";

// Thrown whenever a request should be rejected with 429 Too Many Requests.
export class LimitError extends Error {}

const WINDOW_MS = 60_000;

declare global {
  var __edubuddyIpHits: Map<string, number[]> | undefined;
}

function getIpHits(): Map<string, number[]> {
  if (!globalThis.__edubuddyIpHits) {
    globalThis.__edubuddyIpHits = new Map();
  }
  return globalThis.__edubuddyIpHits;
}

// Sliding-window rate limit: at most getEnv().ipRequestsPerMinute requests
// per IP in any trailing sixty seconds (default 60, overridable through the
// IP_REQUESTS_PER_MINUTE env variable). Throws LimitError once the window is
// full. The cap is read at call time, not module load, so a freshly started
// server process picks up whatever its environment says on the first request.
// The caller (withProfile in api.ts) is responsible for reading the IP from
// the x-forwarded-for header (first value) or falling back to "local".
export function checkIpLimit(ip: string): void {
  const hits = getIpHits();
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((timestamp) => timestamp > windowStart);
  const maxRequests = getEnv().ipRequestsPerMinute;

  if (recent.length >= maxRequests) {
    hits.set(ip, recent);
    throw new LimitError("Too many requests, please slow down");
  }

  recent.push(now);
  hits.set(ip, recent);
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Enforces and records the per-profile daily AI call budget. Resets the
// counter when the profile's aiCallsDate is not today (UTC), throws once the
// cap from getEnv().dailyAiCallCap is reached, otherwise increments the count
// and persists it (and the possibly-reset date) through store.updateProfile.
export async function consumeAiCall(profile: Profile, store: Store): Promise<void> {
  const today = todayUtc();
  const callsToday = profile.aiCallsDate === today ? profile.aiCallsToday : 0;
  const cap = getEnv().dailyAiCallCap;

  if (callsToday >= cap) {
    throw new LimitError("Daily AI limit reached for this browser, try again tomorrow");
  }

  await store.updateProfile(profile.id, {
    aiCallsToday: callsToday + 1,
    aiCallsDate: today,
  });
}
