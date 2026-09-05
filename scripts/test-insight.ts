// Set before any "@/lib" import runs, since getEnv() (src/lib/env.ts) reads
// process.env once per process and caches the result on globalThis. This
// lowers the daily AI call cap to 2 for the whole run so case (j) below can
// prove the cap actually blocks a third AI-backed call, while every case
// before it stays within that budget by construction (see the per-profile
// call counts noted next to each case).
process.env.DAILY_AI_CALL_CAP = "2";

import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { GET as meRoute } from "@/app/api/me/route";
import { POST as explainRoute } from "@/app/api/explain/route";
import { POST as feedbackRoute } from "@/app/api/feedback/route";
import type { ApiErrorResponse, ExplainResponse, FeedbackResponse, MeResponse } from "@/lib/api-types";
import { splitIntoChunks } from "@/lib/ai/text";
import { getStore } from "@/lib/store";
import type { Store } from "@/lib/store/types";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import type { AttemptAnswer, Material, Question, Topic } from "@/lib/types";

// Route-level tests for /api/explain, /api/feedback and /api/me, run without
// a server: the exported route handlers are called directly with hand-built
// NextRequest objects, the same way Next.js itself would call them. No
// GEMINI_API_KEY or FIREBASE_SERVICE_ACCOUNT_JSON is set anywhere here, so
// this always runs against the mock AI and the in-memory store, seeded
// directly through getStore() rather than through the other agents' routes.

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

// ---- request helpers -------------------------------------------------

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

async function callExplain(
  profileId: string,
  body: unknown
): Promise<{ status: number; data: ExplainResponse & ApiErrorResponse }> {
  const response = await explainRoute(buildRequest("/api/explain", profileId, { body }));
  const data = (await response.json()) as ExplainResponse & ApiErrorResponse;
  return { status: response.status, data };
}

async function callFeedback(
  profileId: string,
  body: unknown
): Promise<{ status: number; data: FeedbackResponse & ApiErrorResponse }> {
  const response = await feedbackRoute(buildRequest("/api/feedback", profileId, { body }));
  const data = (await response.json()) as FeedbackResponse & ApiErrorResponse;
  return { status: response.status, data };
}

async function callMe(profileId: string): Promise<{ status: number; data: MeResponse & ApiErrorResponse }> {
  const response = await meRoute(buildRequest("/api/me", profileId, { method: "GET" }));
  const data = (await response.json()) as MeResponse & ApiErrorResponse;
  return { status: response.status, data };
}

// ---- seeding helpers ---------------------------------------------------

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

function buildQuestion(qid: string, topic: Topic): Question {
  return {
    qid,
    topicId: topic.id,
    stem: `Which statement about ${topic.name} is correct?`,
    options: [topic.keyPoints[0] ?? "Correct option", "Wrong option B", "Wrong option C", "Wrong option D"],
    answerIndex: 0,
    explanation: `The correct statement is about ${topic.name}.`,
  };
}

// One quiz and one attempt for profileId on material, with a mix of right
// and wrong answers so score is neither 0 nor 1. completedAt can be pinned
// so two seeded attempts have a deterministic newest-first order. Returns
// the score plus the attempt id and stamp for later assertions.
async function seedQuizAndAttempt(
  store: Store,
  profileId: string,
  material: Material,
  topics: Topic[],
  completedAt: string = new Date().toISOString()
): Promise<{ score: number; attemptId: string; completedAt: string }> {
  const questions = topics.map((topic, index) => buildQuestion(`q${index}`, topic));
  const quiz = await store.createQuiz({
    profileId,
    materialId: material.id,
    topicIds: topics.map((topic) => topic.id),
    difficulty: "medium",
    questions,
    createdAt: new Date().toISOString(),
  });

  // Question 0 correct, question 1 wrong, the rest correct.
  const answers: AttemptAnswer[] = questions.map((question, index) => ({
    qid: question.qid,
    chosenIndex: index === 1 ? 1 : 0,
    correct: index !== 1,
  }));
  const score = answers.filter((answer) => answer.correct).length / answers.length;

  const attempt = await store.createAttempt({
    profileId,
    quizId: quiz.id,
    materialId: material.id,
    answers,
    score,
    completedAt,
  });

  return { score, attemptId: attempt.id, completedAt };
}

// Writes a TopicProgress record directly (bypassing /api/attempt, which is
// owned by another agent), returning whether it counts as weak so the
// caller can track the expected weakTopics stat.
async function seedProgress(
  store: Store,
  profileId: string,
  materialId: string,
  topic: Topic,
  attempts: number,
  correct: number,
  wrong: number
): Promise<boolean> {
  const mastery = correct / (correct + wrong);
  const weak = mastery < 0.6 && attempts >= 3;
  await store.upsertTopicProgress(profileId, {
    topicId: topic.id,
    materialId,
    name: topic.name,
    attempts,
    correct,
    wrong,
    mastery,
    lastAttemptAt: new Date().toISOString(),
    weak,
    explanation: null,
    explanationAt: null,
  });
  return weak;
}

// ---- main ---------------------------------------------------------------

async function main(): Promise<void> {
  const store = getStore();
  const topics = SAMPLE_NOTES.topics;

  // profile1: used for the /api/explain cases (a)-(e) and then reused for
  // the cap case (j). Exactly two AI-backed calls happen against it before
  // (j): case (a) (explain, first time) and case (c) (explain, refresh).
  const profile1 = randomUUID();
  await store.getOrCreateProfile(profile1);
  const material1 = await seedMaterial(store, profile1, "profile1");

  // profile2: used for the /api/feedback and /api/me cases (f)-(h), fully
  // seeded with a quiz, an attempt and progress (one weak topic, one not).
  // Only one AI-backed call happens against it: case (f) (feedback).
  const profile2 = randomUUID();
  await store.getOrCreateProfile(profile2);
  const material2 = await seedMaterial(store, profile2, "profile2");
  const seededFirst = await seedQuizAndAttempt(store, profile2, material2, topics.slice(0, 3));
  const strongWeak = await seedProgress(store, profile2, material2.id, topics[0], 5, 4, 1);
  const weakWeak = await seedProgress(store, profile2, material2.id, topics[1], 4, 1, 3);
  const seededWeakCount = [strongWeak, weakWeak].filter(Boolean).length;
  assert(seededWeakCount >= 1, "seed setup: expected at least one weak topic for profile2");

  // profile3: never touched before case (i), so /api/me should read back as
  // entirely empty.
  const profile3 = randomUUID();

  let explanationFromA = "";
  let feedbackFromF = "";

  await testCase("(a) explain a topic the first time", async () => {
    const { status, data } = await callExplain(profile1, { materialId: material1.id, topicId: topics[0].id });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === false, "expected cached: false on first explain");
    const words = wordCount(data.explanation);
    assert(words >= 150 && words <= 300, `expected 150-300 words, got ${words}`);
    assert(data.keyPoints.length >= 3 && data.keyPoints.length <= 5, `expected 3-5 key points, got ${data.keyPoints.length}`);

    const progress = await store.getTopicProgress(profile1, topics[0].id);
    assert(progress !== null, "expected a progress record to be created");
    assert(progress?.explanation === data.explanation, "expected the progress record to carry the explanation");

    explanationFromA = data.explanation;
  });

  await testCase("(b) explain again is served from the cache", async () => {
    const { status, data } = await callExplain(profile1, { materialId: material1.id, topicId: topics[0].id });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === true, "expected cached: true on the second call");
    assert(data.explanation === explanationFromA, "expected the same explanation text as the first call");
  });

  await testCase("(c) explain with refresh true bypasses the cache", async () => {
    const { status, data } = await callExplain(profile1, {
      materialId: material1.id,
      topicId: topics[0].id,
      refresh: true,
    });
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.cached === false, "expected cached: false when refresh is true");
    const words = wordCount(data.explanation);
    assert(words >= 150 && words <= 300, `expected 150-300 words, got ${words}`);
  });

  await testCase("(d) explain an unknown topic id is 404", async () => {
    const { status, data } = await callExplain(profile1, { materialId: material1.id, topicId: "no-such-topic" });
    assert(status === 404, `expected 404, got ${status}`);
    assert(data.error === "Topic not found", `expected "Topic not found", got ${JSON.stringify(data.error)}`);
  });

  await testCase("(e) explain on another profile's material is 404", async () => {
    const { status, data } = await callExplain(profile1, { materialId: material2.id, topicId: topics[0].id });
    assert(status === 404, `expected 404, got ${status}`);
    assert(data.error === "Not found", `expected "Not found", got ${JSON.stringify(data.error)}`);
  });

  await testCase("(f) feedback with an empty body", async () => {
    const { status, data } = await callFeedback(profile2, {});
    assert(status === 200, `expected 200, got ${status}`);
    const words = wordCount(data.feedback);
    assert(words >= 80 && words <= 150, `expected 80-150 words, got ${words}`);

    const profile = await store.getOrCreateProfile(profile2);
    assert(profile.latestFeedback === data.feedback, "expected the profile's latestFeedback to be set");

    feedbackFromF = data.feedback;
  });

  await testCase("(g) feedback with a materialId that is not owned is 404", async () => {
    const { status, data } = await callFeedback(profile2, { materialId: material1.id });
    assert(status === 404, `expected 404, got ${status}`);
    assert(data.error === "Not found", `expected "Not found", got ${JSON.stringify(data.error)}`);
  });

  await testCase("(h) GET /api/me for the seeded profile", async () => {
    const { status, data } = await callMe(profile2);
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.materials.length === 1 && data.materials[0].id === material2.id, "expected the one seeded material");
    assert(data.progress.length === 2, `expected 2 progress records, got ${data.progress.length}`);
    assert(data.stats.materials === 1, `expected stats.materials 1, got ${data.stats.materials}`);
    assert(data.stats.quizzesTaken === 1, `expected stats.quizzesTaken 1, got ${data.stats.quizzesTaken}`);
    assert(data.stats.averageScore === seededFirst.score, `expected averageScore ${seededFirst.score}, got ${data.stats.averageScore}`);
    assert(
      data.stats.weakTopics === seededWeakCount,
      `expected weakTopics ${seededWeakCount}, got ${data.stats.weakTopics}`
    );
    assert(data.latestFeedback === feedbackFromF, "expected latestFeedback to equal case (f)'s result");
  });

  await testCase("(h2) /api/me lists attempts newest first after two quizzes", async () => {
    // A second quiz and attempt for profile2, on the same sample material,
    // completed strictly after the setup attempt so the order is
    // deterministic (mirrors the quiz seeding pattern of test-quiz.ts).
    const second = await seedQuizAndAttempt(
      store,
      profile2,
      material2,
      topics.slice(2, 5),
      new Date(Date.parse(seededFirst.completedAt) + 60_000).toISOString()
    );

    const { status, data } = await callMe(profile2);
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.attempts.length === 2, `expected 2 attempts, got ${data.attempts.length}`);
    assert(data.attempts[0].id === second.attemptId, "expected the newest attempt first");
    assert(data.attempts[1].id === seededFirst.attemptId, "expected the older attempt second");
    assert(data.attempts[0].questionCount === 3, `expected questionCount 3, got ${data.attempts[0].questionCount}`);
    assert(
      JSON.stringify(data.attempts[0].topicIds) ===
        JSON.stringify(topics.slice(2, 5).map((topic) => topic.id)),
      "expected the newest attempt's topic ids to come from its quiz"
    );
    // The stat still counts every attempt; only the listed summaries cap at 20.
    assert(data.stats.quizzesTaken === 2, `expected quizzesTaken 2, got ${data.stats.quizzesTaken}`);
  });

  await testCase("(i) GET /api/me for a brand-new profile", async () => {
    const { status, data } = await callMe(profile3);
    assert(status === 200, `expected 200, got ${status}`);
    assert(data.materials.length === 0, "expected no materials");
    assert(data.progress.length === 0, "expected no progress");
    assert(data.stats.materials === 0, "expected stats.materials 0");
    assert(data.stats.quizzesTaken === 0, "expected stats.quizzesTaken 0");
    assert(data.stats.weakTopics === 0, "expected stats.weakTopics 0");
    assert(data.stats.averageScore === null, "expected averageScore null");
    assert(data.latestFeedback === null, "expected latestFeedback null");
  });

  await testCase("(j) the daily AI cap blocks a third call but not a cached explain", async () => {
    // profile1 already made exactly two AI-backed calls, in (a) and (c);
    // DAILY_AI_CALL_CAP is 2 for this whole run (set at the top of this
    // file), so a third AI-backed call for profile1 must be refused.
    const feedbackAttempt = await callFeedback(profile1, {});
    assert(feedbackAttempt.status === 429, `expected 429, got ${feedbackAttempt.status}`);

    // A cached explain does not call the AI at all, so it must still work
    // even though profile1 is over its daily cap.
    const cachedExplain = await callExplain(profile1, { materialId: material1.id, topicId: topics[0].id });
    assert(cachedExplain.status === 200, `expected 200, got ${cachedExplain.status}`);
    assert(cachedExplain.data.cached === true, "expected the over-cap explain to still be served from the cache");
  });

  if (anyFailed) {
    console.error("\nOne or more insight route tests failed.");
    process.exit(1);
  }
  console.log("\nAll insight route tests passed.");
}

main().catch((error) => {
  console.error("FAIL: unexpected error -", error instanceof Error ? error.message : error);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
