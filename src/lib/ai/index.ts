import { getRuntimeStatus } from "@/lib/env";
import { OpenRouterAi } from "@/lib/ai/openrouter";
import { MockAi } from "@/lib/ai/mock";
import type { AiClient } from "@/lib/ai/types";

// The one entry point route code should use. Never import OpenRouterAi or
// MockAi directly outside src/lib/ai.

declare global {
  var __edubuddyAi: AiClient | undefined;
}

// Returns the single AiClient for this process: OpenRouterAi when an
// OpenRouter API key is configured, otherwise MockAi. Cached on globalThis
// so every caller shares one instance, matching how getStore() caches the
// Store.
export function getAi(): AiClient {
  if (!globalThis.__edubuddyAi) {
    globalThis.__edubuddyAi =
      getRuntimeStatus().ai === "openrouter" ? new OpenRouterAi() : new MockAi();
  }
  return globalThis.__edubuddyAi;
}

export * from "@/lib/ai/types";
