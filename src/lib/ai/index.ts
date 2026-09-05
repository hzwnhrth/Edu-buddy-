import { getRuntimeStatus } from "@/lib/env";
import { GeminiAi } from "@/lib/ai/gemini";
import { MockAi } from "@/lib/ai/mock";
import type { AiClient } from "@/lib/ai/types";

// The one entry point route code should use. Never import GeminiAi or
// MockAi directly outside src/lib/ai.

declare global {
  var __edubuddyAi: AiClient | undefined;
}

// Returns the single AiClient for this process: GeminiAi when a Gemini API
// key is configured, otherwise MockAi. Cached on globalThis so every caller
// shares one instance, matching how getStore() caches the Store.
export function getAi(): AiClient {
  if (!globalThis.__edubuddyAi) {
    globalThis.__edubuddyAi = getRuntimeStatus().ai === "gemini" ? new GeminiAi() : new MockAi();
  }
  return globalThis.__edubuddyAi;
}

export * from "@/lib/ai/types";
