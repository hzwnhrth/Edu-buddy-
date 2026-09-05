// Set before any "@/lib" import runs, since getEnv() (src/lib/env.ts) reads
// process.env once per process and caches the result on globalThis. This
// lowers the daily AI call cap to 2 for the whole run: cases (a) and (b)
// below make exactly two AI-backed calls against profile1, so case (c) can
// prove the cap blocks a third call, while the 404 cases prove a bad
// materialId is rejected before any AI call is counted.
process.env.DAILY_AI_CALL_CAP = "2";

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { GET as chatGetRoute, DELETE as chatDeleteRoute, POST as chatPostRoute } from "@/app/api/chat/route";
import type { ApiErrorResponse, ChatHistoryResponse, ChatRequest, ChatResponse } from "@/lib/api-types";
import { splitIntoChunks } from "@/lib/ai/text";
import { getStore } from "@/lib/store";
import { getChatStore } from "@/lib/store/chat";
import type { Store } from "@/lib/store/types";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import type { Material } from "@/lib/types";

// Route-level tests for /api/chat, run without a server: the exported route
// handlers are called directly with hand-built NextRequest objects, the same
// way Next.js itself would call them. No GEMINI_API_KEY or
// FIREBASE_SERVICE_ACCOUNT_JSON is set anywhere here, so the AI replies come
// from the mock and the chat history lives in the in-memory chat store (the
// Realtime Database store is only selected when both Firebase settings are
// configured, which no test here does).

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

let anyFailed = false;

async function testCase(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`OK: ${name}`);
  } catch (error) {
    anyFailed = true;
    console.error(`FAIL: ${name} - ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ---- request and seeding helpers ---------------------------------------

function buildRequest(
  path: string,
  profileId: string,
  init?: { method?: string; body?: unknown }
): NextRequest {
  const method = init?.method ?? "POST";
  const headers: Record<string, string> = { "x-profile-id": profileId };
  const requestInit: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers,
  };
  if (init?.body !== undefined) {
    headers["content-type"] = "application/json";
    requestInit.body = JSON.stringify(init.body);
  }
  return new NextRequest(`http://localhost${path}`, requestInit);
}

async function callChat(
  profileId: string,
  body: ChatRequest
): Promise<{ status: number; data: ChatResponse & ApiErrorResponse }> {
  const response = await chatPostRoute(buildRequest("/api/chat", profileId, { body }));
  const data = (await response.json()) as ChatResponse & ApiErrorResponse;
  return { status: response.status, data };
}

async function callChatHistory(
  profileId: string
): Promise<{ status: number; data: ChatHistoryResponse & ApiErrorResponse }> {
  const response = await chatGetRoute(buildRequest("/api/chat", profileId, { method: "GET" }));
  const data = (await response.json()) as ChatHistoryResponse & ApiErrorResponse;
  return { status: response.status, data };
}

// Creates one material for profileId, built from the bundled sample notes,
// so a chat message with materialId carries real notes context.
async function seedMaterial(store: Store, profileId: string, titleSuffix: string): Promise<Material> {
  const chunks = splitIntoChunks(SAMPLE_NOTES.text).map((text, order) => ({ order, text }));
  return store.createMaterial(
    {
      profileId,
      title: `${SAMPLE_NOTES.title} (${titleSuffix})`,
      sourceName: SAMPLE_NOTES.sourceName,
      pageCount: SAMPLE_NOTES.pageCount,
      charCount: SAMPLE_NOTES.text.length,
      status: "ready",
      topics: SAMPLE_NOTES.topics,
      createdAt: new Date().toISOString(),
    },
    chunks
  );
}

// ---- main ---------------------------------------------------------------

async function main(): Promise<void> {
  const store = getStore();
  const chatStore = getChatStore();

  const profile1 = randomUUID();
  await store.getOrCreateProfile(profile1);
  const material1 = await seedMaterial(store, profile1, "profile1");

  // A foreign material owned by profile2: profile1 must never be able to
  // point a chat message at it.
  const profile2 = randomUUID();
  await store.getOrCreateProfile(profile2);
  const material2 = await seedMaterial(store, profile2, "profile2");

  await testCase("(a) chat reply shape with an active material", async () => {
    const { status, data } = await callChat(profile1, {
      message: "What do these notes say about packets?",
      materialId: material1.id,
      history: [],
    });
    assert(status === 200, `expected 200, got ${status}`);
    const words = wordCount(data.reply);
    assert(words >= 40 && words <= 150, `expected a 40-150 word reply, got ${words}`);
    assert(Array.isArray(data.suggestions), "expected suggestions to be an array");
    assert(data.suggestions.length >= 0 && data.suggestions.length <= 3, `expected 0-3 suggestions, got ${data.suggestions.length}`);
    for (const suggestion of data.suggestions) {
      assert(typeof suggestion === "string" && suggestion.length > 0, "every suggestion must be a non-empty string");
    }
  });

  await testCase("(b) chat history round trip in the memory store", async () => {
    // Second message without a materialId: general study help path. The
    // server must append the user message and the reply to the stored
    // history, oldest first.
    const message = "How should I plan my revision for these topics?";
    const { status, data } = await callChat(profile1, { message, history: [] });
    assert(status === 200, `expected 200, got ${status}`);

    const { status: historyStatus, data: history } = await callChatHistory(profile1);
    assert(historyStatus === 200, `expected 200, got ${historyStatus}`);
    assert(history.messages.length === 4, `expected 4 stored messages after two turns, got ${history.messages.length}`);
    assert(history.messages.every((entry) => entry.role === "user" || entry.role === "assistant"), "every stored message needs a valid role");
    assert(history.messages[2].role === "user" && history.messages[2].content === message, "expected the second user message stored verbatim");
    assert(history.messages[3].role === "assistant" && history.messages[3].content === data.reply, "expected the second reply stored verbatim");

    // The chat store itself exposes the same history.
    const direct = await chatStore.getMessages(profile1);
    assert(direct.length === 4, "expected the chat store to hold the same 4 messages");
  });

  await testCase("(c) chat counts against the daily AI cap", async () => {
    // Cases (a) and (b) spent both daily calls for profile1.
    const { status } = await callChat(profile1, { message: "One more question, please.", history: [] });
    assert(status === 429, `expected 429, got ${status}`);
  });

  await testCase("(d) chat with a foreign or unknown materialId is 404", async () => {
    // Both are rejected at the material check, before the AI call, so they
    // answer 404 even though profile1 is now over its daily cap.
    const foreign = await callChat(profile1, { message: "Hello?", materialId: material2.id, history: [] });
    assert(foreign.status === 404, `expected 404 for a foreign material, got ${foreign.status}`);
    assert(foreign.data.error === "Not found", `expected "Not found", got ${JSON.stringify(foreign.data.error)}`);

    const unknown = await callChat(profile1, { message: "Hello?", materialId: randomUUID(), history: [] });
    assert(unknown.status === 404, `expected 404 for an unknown material, got ${unknown.status}`);
  });

  await testCase("(e) failed calls change nothing and a fresh profile starts empty", async () => {
    const { status, data } = await callChatHistory(profile1);
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.messages.length === 4, "expected the over-cap attempts to add nothing to the history");

    const fresh = await callChatHistory(randomUUID());
    assert(fresh.status === 200, `expected 200, got ${fresh.status}`);
    assert(fresh.data.messages.length === 0, "expected a fresh profile to have no stored messages");
  });

  await testCase("(f) DELETE clears the history and later GETs return empty", async () => {
    // profile1 still holds the 4 messages from cases (a) and (b).
    const deleteResponse = await chatDeleteRoute(
      buildRequest("/api/chat", profile1, { method: "DELETE" })
    );
    assert(deleteResponse.status === 200, `expected 200, got ${deleteResponse.status}`);
    const deleted = (await deleteResponse.json()) as ChatHistoryResponse & ApiErrorResponse;
    assert(Array.isArray(deleted.messages) && deleted.messages.length === 0, "expected the DELETE response to carry an empty messages array");

    const after = await callChatHistory(profile1);
    assert(after.status === 200, `expected 200, got ${after.status}`);
    assert(after.data.messages.length === 0, "expected the stored history to be empty after DELETE");

    // Clearing again, on a profile with nothing stored, is still a calm 200.
    const again = await chatDeleteRoute(
      buildRequest("/api/chat", randomUUID(), { method: "DELETE" })
    );
    assert(again.status === 200, `expected 200 for a second DELETE, got ${again.status}`);
  });

  if (anyFailed) {
    console.error("\nOne or more chat route tests failed.");
    process.exit(1);
  }
  console.log("\nAll chat route tests passed.");
}

main().catch((error) => {
  console.error("FAIL: unexpected error -", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
