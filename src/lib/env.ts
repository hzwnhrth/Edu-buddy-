import type { RuntimeStatus } from "@/lib/types";

// The subset of process.env this app reads, trimmed and parsed once per process.
export interface Env {
  geminiApiKey: string;
  geminiModel: string;
  firebaseServiceAccountJson: string;
  dailyAiCallCap: number;
}

const DEFAULT_DAILY_AI_CALL_CAP = 60;

declare global {
  var __edubuddyEnv: Env | undefined;
}

function readEnv(): Env {
  const geminiApiKey = (process.env.GEMINI_API_KEY ?? "").trim();
  const geminiModel = (process.env.GEMINI_MODEL ?? "").trim();
  const firebaseServiceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? "").trim();
  const rawCap = (process.env.DAILY_AI_CALL_CAP ?? "").trim();
  const parsedCap = parseInt(rawCap, 10);
  const dailyAiCallCap = Number.isNaN(parsedCap) ? DEFAULT_DAILY_AI_CALL_CAP : parsedCap;

  return { geminiApiKey, geminiModel, firebaseServiceAccountJson, dailyAiCallCap };
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
    ai: env.geminiApiKey ? "gemini" : "mock",
    store: env.firebaseServiceAccountJson ? "firestore" : "memory",
    model: env.geminiModel || null,
  };
}
