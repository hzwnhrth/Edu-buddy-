import { jsonOk, withProfile } from "@/lib/api";
import type { AttemptSummary, MeResponse } from "@/lib/api-types";
import type { Quiz } from "@/lib/types";

// Firebase Admin verifies bearer tokens in this route and requires Node APIs.
export const runtime = "nodejs";

// How many past attempts the dashboard needs: the most recent ones only.
const MAX_ME_ATTEMPTS = 20;

// GET /api/me: everything the dashboard needs in one call, all scoped to the
// requesting profile.
export const GET = withProfile(async ({ profile, store }) => {
  const materials = await store.listMaterials(profile.id);
  const progress = await store.listTopicProgress(profile.id);

  // listAttempts returns newest first, so the cap keeps the most recent 20.
  const attempts = await store.listAttempts(profile.id);

  const averageScore =
    attempts.length === 0
      ? null
      : attempts.reduce((total, attempt) => total + attempt.score, 0) / attempts.length;

  // Summaries for the capped list only; each quiz is loaded at most once
  // even when several attempts share it (same pattern as
  // /api/materials/[id]).
  const recent = attempts.slice(0, MAX_ME_ATTEMPTS);
  const quizCache = new Map<string, Quiz | null>();
  const attemptSummaries: AttemptSummary[] = [];
  for (const attempt of recent) {
    if (!quizCache.has(attempt.quizId)) {
      quizCache.set(attempt.quizId, await store.getQuiz(attempt.quizId));
    }
    const quiz = quizCache.get(attempt.quizId) ?? null;
    attemptSummaries.push({
      id: attempt.id,
      quizId: attempt.quizId,
      score: attempt.score,
      questionCount: attempt.answers.length,
      completedAt: attempt.completedAt,
      topicIds: quiz ? quiz.topicIds : [],
    });
  }

  const response: MeResponse = {
    profileId: profile.id,
    materials,
    progress,
    attempts: attemptSummaries,
    latestFeedback: profile.latestFeedback,
    latestFeedbackAt: profile.latestFeedbackAt,
    stats: {
      materials: materials.length,
      quizzesTaken: attempts.length,
      averageScore,
      weakTopics: progress.filter((entry) => entry.weak).length,
    },
  };
  return jsonOk(response);
});
