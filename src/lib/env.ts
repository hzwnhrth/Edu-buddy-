import type { RuntimeStatus } from "@/lib/types";

// The subset of process.env this app reads, trimmed and parsed once per process.
export interface Env {
  openrouterApiKey: string;
  openrouterModel: string;
  firebaseServiceAccountJson: string;
  firebaseDatabaseUrl: string;
  dailyAiCallCap: number;
  ipRequestsPerMinute: number;
}

const DEFAULT_DAILY_AI_CALL_CAP = 60;

const DEFAULT_IP_REQUESTS_PER_MINUTE = 60;
const MIN_IP_REQUESTS_PER_MINUTE = 1;
const MAX_IP_REQUESTS_PER_MINUTE = 100000;

declare global {
  var __edubuddyEnv: Env | undefined;
}

function readEnv(): Env {
  const openrouterApiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  const openrouterModel = (process.env.OPENROUTER_MODEL ?? "").trim();
  const firebaseServiceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "").trim();
  const firebaseDatabaseUrl = (process.env.FIREBASE_DATABASE_URL ?? "").trim();
  const rawCap = (process.env.DAILY_AI_CALL_CAP ?? "").trim();
  const parsedCap = parseInt(rawCap, 10);
  const dailyAiCallCap = Number.isNaN(parsedCap) ? DEFAULT_DAILY_AI_CALL_CAP : parsedCap;
  const rawPerMinute = (process.env.IP_REQUESTS_PER_MINUTE ?? "").trim();
  const parsedPerMinute = parseInt(rawPerMinute, 10);
  const ipRequestsPerMinute =
    Number.isNaN(parsedPerMinute) ||
    parsedPerMinute < MIN_IP_REQUESTS_PER_MINUTE ||
    parsedPerMinute > MAX_IP_REQUESTS_PER_MINUTE
      ? DEFAULT_IP_REQUESTS_PER_MINUTE
      : parsedPerMinute;

  return {
    openrouterApiKey,
    openrouterModel,
    firebaseServiceAccountJson,
    firebaseDatabaseUrl,
    dailyAiCallCap,
    ipRequestsPerMinute,
  };
}

// Reads and caches process.env for this process. Call sites should use this
// instead of process.env directly so trimming and parsing happen exactly once,
// and so the values survive Next.js dev server hot reloads.
export function getEnv(): Env {
  if (!globalThis.__edubuddyEnv) {
    globalThis.__edubuddyEnv = readEnv();
  }
  return globalThis.__edubuddyEnv;
}

// A client-safe summary of which backends are active. Never expose raw env
// values (keys, service account JSON) through this or anything derived from it.
export function getRuntimeStatus(): RuntimeStatus {
  const env = getEnv();
  return {
    ai: env.openrouterApiKey ? "openrouter" : "mock",
    store:
      env.firebaseServiceAccountJson && env.firebaseDatabaseUrl ? "rtdb" : "memory",
    model: env.openrouterModel || null,
  };
}
