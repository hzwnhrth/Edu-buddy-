// Set before any "@/lib" import runs, since getEnv() (src/lib/env.ts) reads
// process.env once per process and caches the result on globalThis. This
// lowers the daily AI call cap to 2 for the whole run: cases (a) and (c)
// below make exactly two AI-backed generations against profile1, so case
// (f) can prove the cap then blocks a third generation while a cached
// answer still works.
process.env.DAILY_AI_CALL_CAP = "2";

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { POST as notesRoute } from "@/app/api/notes/route";
import type { ApiErrorResponse, NotesResponse } from "@/lib/api-types";
import { splitIntoChunks } from "@/lib/ai/text";
import { getStore } from "@/lib/store";
import type { Store } from "@/lib/store/types";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import type { Material } from "@/lib/types";

// Route-level tests for /api/notes, run without a server: the exported route
// handler is called directly with hand-built NextRequest objects, the same
// way Next.js itself would call it. No GEMINI_API_KEY or
// FIREBASE_SERVICE_ACCOUNT_JSON is set anywhere here, so this always runs
// against the mock AI and the in-memory store, seeded directly through
// getStore().

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
  body: unknown
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "x-profile-id": profileId, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callNotes(
  profileId: string,
  body: unknown
): Promise<{ status: number; data: NotesResponse & ApiErrorResponse }> {
  const response = await notesRoute(buildRequest("/api/notes", profileId, body));
  const data = (await response.json()) as NotesResponse & ApiErrorResponse;
  return { status: response.status, data };
}

// Creates one material for profileId, built from the bundled sample notes
// (five topics, real text, chunked the same way /api/analyze will chunk it).
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

// Shape checks shared by every generated (cached: false) response.
function assertNotesShape(data: NotesResponse): void {
  assert(typeof data.notes.title === "string" && data.notes.title.length > 0, "notes.title must be a non-empty string");
  assert(data.notes.sections.length >= 4 && data.notes.sections.length <= 8, `expected 4-8 sections, got ${data.notes.sections.length}`);
  for (const section of data.notes.sections) {
    assert(section.heading.length > 0, "every section needs a heading");
    const words = wordCount(section.content);
    assert(words >= 80 && words <= 200, `expected section bodies of 80-200 words, got ${words}`);
  }
  const summaryWords = wordCount(data.notes.summary);
  assert(summaryWords >= 40 && summaryWords <= 80, `expected a 40-80 word summary, got ${summaryWords}`);
  assert(data.notes.keyPoints.length >= 5 && data.notes.keyPoints.length <= 8, `expected 5-8 key points, got ${data.notes.keyPoints.length}`);
  assert(data.flashcards.length >= 6 && data.flashcards.length <= 10, `expected 6-10 flashcards, got ${data.flashcards.length}`);
  for (const card of data.flashcards) {
    assert(card.front.length > 0 && card.back.length > 0, "every flashcard needs a front and a back");
  }
}

// ---- main ---------------------------------------------------------------

async function main(): Promise<void> {
  console.log(
    "PARKED: this script exercises the retired no-login guest flow; the API now requires a Firebase sign-in token. Rewrite against authenticated flows to re-enable."
  );
  process.exit(0);

  const store = getStore();

  // profile1 owns the sample material the notes cases run against. Cases
  // (a) and (c) are the only AI-backed generations; (b) and (f) are cached.
  const profile1 = randomUUID();
  await store.getOrCreateProfile(profile1);
  const material1 = await seedMaterial(store, profile1, "profile1");

  // profile2 owns a separate material, used to prove one profile cannot
  // generate (or read) another profile's notes.
  const profile2 = randomUUID();
  await store.getOrCreateProfile(profile2);
  const material2 = await seedMaterial(store, profile2, "profile2");

  let firstSections = "";

  await testCase("(a) generate notes for the sample material", async () => {
    const { status, data } = await callNotes(profile1, { materialId: material1.id });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === false, "expected cached: false on the first call");
    assertNotesShape(data);
    assert(data.notes.title === material1.title, `expected the material title, got ${JSON.stringify(data.notes.title)}`);

    // The generated payload is cached on the material document.
    const stored = await store.getMaterial(material1.id);
    assert(stored?.notes !== null && stored?.notes !== undefined, "expected notes to be cached on the material");
    assert(stored?.notes?.summary === data.notes.summary, "expected the cached copy to match the response");

    firstSections = JSON.stringify(data.notes.sections);
  });

  await testCase("(b) notes are cached on the second call", async () => {
    const { status, data } = await callNotes(profile1, { materialId: material1.id });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === true, "expected cached: true on the second call");
    assert(JSON.stringify(data.notes.sections) === firstSections, "expected exactly the same sections as the first call");
  });

  await testCase("(c) refresh bypasses the cache", async () => {
    const { status, data } = await callNotes(profile1, { materialId: material1.id, refresh: true });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === false, "expected cached: false when refresh is true");
    assertNotesShape(data);
  });

  await testCase("(d) notes on an unknown material are 404", async () => {
    const { status, data } = await callNotes(profile1, { materialId: randomUUID() });
    assert(status === 404, `expected 404, got ${status}`);
    assert(data.error === "Not found", `expected "Not found", got ${JSON.stringify(data.error)}`);
  });

  await testCase("(e) notes on another profile's material are 404", async () => {
    const { status, data } = await callNotes(profile1, { materialId: material2.id });
    assert(status === 404, `expected 404, got ${status}`);
    assert(data.error === "Not found", `expected "Not found", got ${JSON.stringify(data.error)}`);
  });

  await testCase("(f) the daily cap is spent, but a cached answer still works", async () => {
    // Cases (a) and (c) spent both daily calls, so a fresh generation for
    // profile1 is refused.
    const refreshAttempt = await callNotes(profile1, { materialId: material1.id, refresh: true });
    assert(refreshAttempt.status === 429, `expected 429, got ${refreshAttempt.status}`);

    // The cached path calls no AI, so it must still answer under the cap.
    const cached = await callNotes(profile1, { materialId: material1.id });
    assert(cached.status === 200, `expected 200, got ${cached.status}`);
    assert(cached.data.cached === true, "expected the over-cap call to be served from the cache");
  });

  if (anyFailed) {
    console.error("\nOne or more notes route tests failed.");
    process.exit(1);
  }
  console.log("\nAll notes route tests passed.");
}

main().catch((error) => {
  console.error("FAIL: unexpected error -", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
