import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { AiError, getAi } from "@/lib/ai";
import { selectChunks } from "@/lib/ai/text";
import { consumeAiCall } from "@/lib/limits";
import type { ExplainRequest, ExplainResponse } from "@/lib/api-types";
import type { Store } from "@/lib/store/types";
import type { Question, TopicProgress } from "@/lib/types";

const explainRequestSchema = z.object({
  materialId: z.string().min(1),
  topicId: z.string().min(1),
  refresh: z.boolean().optional(),
}) satisfies z.ZodType<ExplainRequest>;

// Most recent wrong answers on this topic sent to the AI as extra context.
const MAX_WRONG_QUESTIONS = 5;

// Every question this profile got wrong on this topic, most recent attempt
// first (store.listAttempts already returns newest-first), stopping once
// MAX_WRONG_QUESTIONS have been collected. Quizzes are loaded once each and
// cached, since the same quiz can show up in several attempts.
async function collectWrongQuestions(
  store: Store,
  profileId: string,
  materialId: string,
  topicId: string
): Promise<Question[]> {
  const attempts = await store.listAttempts(profileId, materialId);
  const quizzes = new Map<string, Awaited<ReturnType<typeof store.getQuiz>>>();
  const wrong: Question[] = [];

  for (const attempt of attempts) {
    if (wrong.length >= MAX_WRONG_QUESTIONS) break;

    if (!quizzes.has(attempt.quizId)) {
      quizzes.set(attempt.quizId, await store.getQuiz(attempt.quizId));
    }
    const quiz = quizzes.get(attempt.quizId);
    if (!quiz) continue;

    for (const answer of attempt.answers) {
      if (wrong.length >= MAX_WRONG_QUESTIONS) break;
      if (answer.correct) continue;
      const question = quiz.questions.find((candidate) => candidate.qid === answer.qid);
      if (question && question.topicId === topicId) {
        wrong.push(question);
      }
    }
  }

  return wrong;
}

// POST /api/explain: a plain-language explanation of one topic, cached on
// the profile's TopicProgress record until asked to refresh.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, explainRequestSchema);

  const material = await store.getMaterial(body.materialId);
  if (!material || material.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  const topic = material.topics.find((candidate) => candidate.id === body.topicId);
  if (!topic) {
    return jsonError(404, "Topic not found");
  }

  const existing = await store.getTopicProgress(profile.id, topic.id);
  if (existing && existing.explanation && !body.refresh) {
    const response: ExplainResponse = {
      topicId: topic.id,
      name: topic.name,
      explanation: existing.explanation,
      keyPoints: topic.keyPoints,
      cached: true,
    };
    return jsonOk(response);
  }

  const wrongQuestions = await collectWrongQuestions(store, profile.id, body.materialId, topic.id);
  const chunks = await store.getChunks(body.materialId);
  const selected = selectChunks(
    chunks.map((chunk) => chunk.text),
    [topic]
  );

  await consumeAiCall(profile, store);

  let explanation: string;
  let keyPoints: string[];
  try {
    const result = await getAi().explainTopic({ topic, chunks: selected, wrongQuestions });
    explanation = result.explanation;
    keyPoints = result.keyPoints;
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  const now = new Date().toISOString();
  const progress: TopicProgress = existing
    ? { ...existing, explanation, explanationAt: now }
    : {
        topicId: topic.id,
        materialId: body.materialId,
        name: topic.name,
        attempts: 0,
        correct: 0,
        wrong: 0,
        mastery: 0,
        lastAttemptAt: null,
        weak: false,
        explanation,
        explanationAt: now,
      };
  await store.upsertTopicProgress(profile.id, progress);

  const response: ExplainResponse = {
    topicId: topic.id,
    name: topic.name,
    explanation,
    keyPoints,
    cached: false,
  };
  return jsonOk(response);
});
