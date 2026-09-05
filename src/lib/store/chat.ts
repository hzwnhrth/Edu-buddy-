import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabaseWithUrl, type Database } from "firebase-admin/database";
import { getEnv } from "@/lib/env";
import type { ChatMessage } from "@/lib/types";

// Per-profile chat history storage for /api/chat. This is deliberately NOT
// part of the Store interface: the main Store keeps materials, quizzes,
// attempts and progress, while chat history has its own two backends. The
// Realtime Database is used when BOTH the service account and
// FIREBASE_DATABASE_URL are configured; otherwise an in-process map, which
// resets with the process exactly like MemoryStore.

// The stored history is capped at this many messages per profile, matching
// the spec: the server keeps the last 50. The memory store trims on every
// append; the Realtime Database store keeps appending and reads only the
// last 50 (push keys sort chronologically, so limitToLast is the tail).
const MAX_CHAT_MESSAGES = 50;

// The persistence contract for chat history. Messages are stored oldest
// first and returned oldest first; clear drops the profile's whole stored
// history.
export interface ChatHistoryStore {
  appendMessages(profileId: string, messages: ChatMessage[]): Promise<void>;
  getMessages(profileId: string): Promise<ChatMessage[]>;
  clear(profileId: string): Promise<void>;
}

// ---- in-memory implementation --------------------------------------------

interface MemoryChatTables {
  messagesByProfile: Map<string, ChatMessage[]>;
}

declare global {
  var __edubuddyChatMemory: MemoryChatTables | undefined;
}

function getChatTables(): MemoryChatTables {
  if (!globalThis.__edubuddyChatMemory) {
    globalThis.__edubuddyChatMemory = { messagesByProfile: new Map() };
  }
  return globalThis.__edubuddyChatMemory;
}

// In-process implementation, used whenever the Realtime Database is not
// configured. Kept on globalThis so a dev-server hot reload reattaches to
// the same data instead of starting empty (same pattern as MemoryStore).
export class MemoryChatHistoryStore implements ChatHistoryStore {
  private tables = getChatTables();

  async appendMessages(profileId: string, messages: ChatMessage[]): Promise<void> {
    const existing = this.tables.messagesByProfile.get(profileId) ?? [];
    const combined = [...existing, ...messages].slice(-MAX_CHAT_MESSAGES);
    this.tables.messagesByProfile.set(profileId, combined);
  }

  async getMessages(profileId: string): Promise<ChatMessage[]> {
    const existing = this.tables.messagesByProfile.get(profileId) ?? [];
    return existing.slice(-MAX_CHAT_MESSAGES).map((message) => ({ ...message }));
  }

  async clear(profileId: string): Promise<void> {
    this.tables.messagesByProfile.delete(profileId);
  }
}

// ---- Realtime Database implementation ------------------------------------

declare global {
  var __edubuddyRtdb: Database | undefined;
}

// Lazily creates (or reuses) the admin app from FIREBASE_SERVICE_ACCOUNT_JSON
// and returns the Realtime Database for FIREBASE_DATABASE_URL, guarded so a
// hot reload or a second caller never initializes the app twice. The app
// setup mirrors FirestoreStore.getDb, so whichever backend runs first
// initializes the shared default app and the other one reuses it.
export function getRtdb(): Database {
  if (globalThis.__edubuddyRtdb) {
    return globalThis.__edubuddyRtdb;
  }
  const url = getEnv().firebaseDatabaseUrl;
  if (!url) {
    throw new Error("FIREBASE_DATABASE_URL is not set, so the Realtime Database cannot be reached.");
  }
  if (getApps().length === 0) {
    const raw = getEnv().firebaseServiceAccountJson;
    if (!raw) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set, so the Realtime Database cannot be reached.");
    }
    const parsed = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
    initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Service account JSON pasted into a single-line env var often
        // carries the key's newlines as the literal two characters "\n";
        // turn those back into real newlines or the private key fails to
        // parse.
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
    });
  }
  // Per node_modules/firebase-admin/lib/database/index.d.ts (14.3.0):
  // getDatabaseWithUrl(url, app?) returns the Database for a specific URL,
  // which is what a non-default database instance needs.
  globalThis.__edubuddyRtdb = getDatabaseWithUrl(url);
  return globalThis.__edubuddyRtdb;
}

function chatPath(profileId: string): string {
  return `chats/${profileId}/messages`;
}

// Realtime Database implementation. Each message is pushed as its own child
// under chats/{profileId}/messages; push keys are chronological, so reading
// with limitToLast returns the newest tail in oldest-first order.
export class RtdbChatHistoryStore implements ChatHistoryStore {
  async appendMessages(profileId: string, messages: ChatMessage[]): Promise<void> {
    const ref = getRtdb().ref(chatPath(profileId));
    for (const message of messages) {
      // push(value) returns a ThenableReference that resolves once the
      // server has accepted the write.
      await ref.push(message);
    }
  }

  async getMessages(profileId: string): Promise<ChatMessage[]> {
    // Query.limitToLast(n) plus Query.get(), per
    // node_modules/@firebase/database-types/index.d.ts.
    const snap = await getRtdb().ref(chatPath(profileId)).limitToLast(MAX_CHAT_MESSAGES).get();
    const entries: { key: string; message: ChatMessage }[] = [];
    snap.forEach((child) => {
      const value = child.val() as Partial<ChatMessage> | null;
      if (
        child.key &&
        value &&
        (value.role === "user" || value.role === "assistant") &&
        typeof value.content === "string"
      ) {
        entries.push({ key: child.key, message: { role: value.role, content: value.content } });
      }
      return false;
    });
    // forEach order is not depended on: sort by push key, which sorts
    // chronologically, so the result is oldest first either way.
    entries.sort((a, b) => a.key.localeCompare(b.key));
    return entries.map((entry) => entry.message);
  }

  async clear(profileId: string): Promise<void> {
    // Reference.remove(), per node_modules/@firebase/database-types:
    // removes this location's whole subtree, which is exactly the stored
    // history for this profile and nothing else.
    await getRtdb().ref(chatPath(profileId)).remove();
  }
}

// ---- the entry point -------------------------------------------------------

declare global {
  var __edubuddyChatStore: ChatHistoryStore | undefined;
}

// Returns the single ChatHistoryStore for this process: the Realtime
// Database when both Firebase settings are configured, the in-memory store
// otherwise. Cached on globalThis so every caller shares one instance.
export function getChatStore(): ChatHistoryStore {
  if (!globalThis.__edubuddyChatStore) {
    const env = getEnv();
    globalThis.__edubuddyChatStore =
      env.firebaseServiceAccountJson && env.firebaseDatabaseUrl
        ? new RtdbChatHistoryStore()
        : new MemoryChatHistoryStore();
  }
  return globalThis.__edubuddyChatStore;
}
