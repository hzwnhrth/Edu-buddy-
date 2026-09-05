import { getRuntimeStatus } from "@/lib/env";
import { MemoryStore } from "@/lib/store/memory";
import { RtdbStore } from "@/lib/store/rtdb";
import type { Store } from "@/lib/store/types";

declare global {
  var __edubuddyStore: Store | undefined;
}

// Returns the single Store instance for this process: RtdbStore when both the
// Firebase service account and FIREBASE_DATABASE_URL are configured,
// otherwise MemoryStore. Cached on globalThis so every caller shares the same
// instance and, for MemoryStore, the same in-process data.
export function getStore(): Store {
  if (!globalThis.__edubuddyStore) {
    globalThis.__edubuddyStore =
      getRuntimeStatus().store === "rtdb" ? new RtdbStore() : new MemoryStore();
  }
  return globalThis.__edubuddyStore;
}

export type { Store } from "@/lib/store/types";
