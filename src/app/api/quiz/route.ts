import { z } from "zod";
import { AiError, getAi } from "@/lib/ai";
import { selectChunks } from "@/lib/ai/text";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { MAX_QUIZ_QUESTIONS, consumeAiCall } from "@/lib/limits";
import { toPublicQuiz } from "@/lib/quiz-grading";
import type { QuizResponse } from "@/lib/api-types";
import type { Question, Topic } from "@/lib/types";

const quizRequestSchema = z.object({
  materialId: z.string().min(1),
  topicIds: z.array(z.string().min(1)).min(1).optional(),
  count: z.number().int().min(1).max(MAX_QUIZ_QUESTIONS).default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  focusWeak: z.boolean().optional(),
});

// Unique topic ids from `pool` that at least one of `questions` actually
// used, kept in pool order.
function usedTopicIds(pool: Topic[], questions: Question[]): string[] {
  const used = new Set(questions.map((question) => question.topicId));
  return pool.filter((topic) => used.has(topic.id)).map((topic) => topic.id);
}

// Generates a quiz over one or more topics of a material and stores it.
// Returns the quiz with its answer key included (the Quiz screen reveals it
// client-side); grading stays server-side in /api/attempt.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, quizRequestSchema);

  const material = await store.getMaterial(body.materialId);
  if (!material || material.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  const selectedTopics = body.topicIds
    ? material.topics.filter((topic) => body.topicIds?.includes(topic.id))
    : material.topics;
  if (selectedTopics.length === 0) {
    return jsonError(400, "None of the given topics were found on this material");
  }

  // focusWeak widens the pool sent to the AI to every topic on the material
  // (so it has other questions to fill in with) while telling it to spend at
  // least 70 percent of the quiz on the originally selected topics.
  const poolTopics = body.focusWeak ? material.topics : selectedTopics;
  const focusTopicIds = body.focusWeak ? selectedTopics.map((topic) => topic.id) : undefined;

  const chunkRecords = await store.getChunks(material.id);
  const chunks = selectChunks(
    chunkRecords.map((chunk) => chunk.text),
    poolTopics
  );

  await consumeAiCall(profile, store);

  let questions: Question[];
  try {
    questions = await getAi().generateQuiz({
      topics: poolTopics,
      chunks,
      count: body.count,
      difficulty: body.difficulty,
      focusTopicIds,
    });
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  if (questions.length === 0) {
    return jsonError(503, "The quiz could not be generated. Please try again.");
  }

  const quiz = await store.createQuiz({
    profileId: profile.id,
    materialId: material.id,
    topicIds: usedTopicIds(poolTopics, questions),
    difficulty: body.difficulty,
    questions,
    createdAt: new Date().toISOString(),
  });

  return jsonOk<QuizResponse>({ quiz: toPublicQuiz(quiz) }, 201);
});
