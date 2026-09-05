import { getRuntimeStatus } from "@/lib/env";
import { FirestoreStore } from "@/lib/store/firestore";
import { MemoryStore } from "@/lib/store/memory";
import type { Store } from "@/lib/store/types";

declare global {
  var __edubuddyStore: Store | undefined;
}

// Returns the single Store instance for this process: FirestoreStore when a
// Firebase service account is configured, otherwise MemoryStore. Cached on
// globalThis so every caller shares the same instance and, for MemoryStore,
// the same in-process data.
export function getStore(): Store {
  if (!globalThis.__edubuddyStore) {
    globalThis.__edubuddyStore =
      getRuntimeStatus().store === "firestore" ? new FirestoreStore() : new MemoryStore();
  }
  return globalThis.__edubuddyStore;
}

export type { Store } from "@/lib/store/types";
