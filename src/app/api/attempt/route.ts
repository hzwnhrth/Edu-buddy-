import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { applyAttemptToProgress, buildTopicResults, gradeAnswers } from "@/lib/quiz-grading";
import type { AttemptResponse } from "@/lib/api-types";
import type { TopicProgress } from "@/lib/types";

const attemptRequestSchema = z.object({
  quizId: z.string().min(1),
  answers: z
    .array(
      z.object({
        qid: z.string().min(1),
        chosenIndex: z.number().int(),
      })
    )
    .min(1),
});

// Grades a finished quiz attempt, stores it, and folds the result into the
// profile's per-topic progress.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, attemptRequestSchema);

  const quiz = await store.getQuiz(body.quizId);
  if (!quiz || quiz.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  const material = await store.getMaterial(quiz.materialId);
  if (!material) {
    return jsonError(404, "Not found");
  }

  const { results, score, attemptAnswers } = gradeAnswers(quiz, body.answers);

  const now = new Date().toISOString();
  const attempt = await store.createAttempt({
    profileId: profile.id,
    quizId: quiz.id,
    materialId: quiz.materialId,
    answers: attemptAnswers,
    score,
    completedAt: now,
  });

  const topicIdsInQuiz = [...new Set(quiz.questions.map((question) => question.topicId))];
  const progressByTopic = new Map<string, TopicProgress>();

  for (const topicId of topicIdsInQuiz) {
    const topic = material.topics.find((candidate) => candidate.id === topicId);
    if (!topic) continue;

    const topicResults = results.filter((result) => result.topicId === topicId);
    const correctDelta = topicResults.filter((result) => result.correct).length;
    const wrongDelta = topicResults.length - correctDelta;

    const existing = await store.getTopicProgress(profile.id, topicId);
    const updated = applyAttemptToProgress(existing, topic, material.id, correctDelta, wrongDelta, now);
    await store.upsertTopicProgress(profile.id, updated);
    progressByTopic.set(topicId, updated);
  }

  const topicResults = buildTopicResults(quiz, results, progressByTopic, material);

  return jsonOk<AttemptResponse>({ attempt, results, topicResults }, 201);
});
