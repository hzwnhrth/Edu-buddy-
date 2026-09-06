import { jsonError, jsonOk, parseBody, withProfile, withRole } from "@/lib/api";
import { z } from "zod";
import type { AttemptSummary, MaterialResponse } from "@/lib/api-types";
import type { Quiz } from "@/lib/types";

// One material with its quiz history (as AttemptSummary, topic ids resolved
// from each attempt's quiz) and this profile's progress on that material's
// topics.
export const GET = withProfile<{ id: string }>(async ({ profile, store, params }) => {
  const material = await store.getMaterial(params.id);
  if (!material || (material.profileId !== profile.id && material.visibility !== "published")) {
    return jsonError(404, "Not found");
  }

  const attempts = await store.listAttempts(profile.id, material.id);

  // Each attempt's quiz is loaded at most once, even when several attempts
  // share the same quiz.
  const quizCache = new Map<string, Quiz | null>();
  async function loadQuiz(quizId: string): Promise<Quiz | null> {
    if (!quizCache.has(quizId)) {
      quizCache.set(quizId, await store.getQuiz(quizId));
    }
    return quizCache.get(quizId) ?? null;
  }

  const attemptSummaries: AttemptSummary[] = [];
  for (const attempt of attempts) {
    const quiz = await loadQuiz(attempt.quizId);
    attemptSummaries.push({
      id: attempt.id,
      quizId: attempt.quizId,
      score: attempt.score,
      questionCount: attempt.answers.length,
      completedAt: attempt.completedAt,
      topicIds: quiz ? quiz.topicIds : [],
    });
  }

  const progress = (await store.listTopicProgress(profile.id)).filter(
    (entry) => entry.materialId === material.id
  );

  return jsonOk<MaterialResponse>({ material, attempts: attemptSummaries, progress });
});

export const PATCH = withRole<{ id: string }>("teacher", async ({ request, identity, store, params }) => {
  const { visibility } = await parseBody(request, z.object({ visibility: z.enum(["draft", "published"]) }));
  const material = await store.getMaterial(params.id);
  if (!material || material.profileId !== identity.uid) return jsonError(404, "Not found");
  if (material.status !== "ready" || !material.notes) return jsonError(400, "Generate notes before publishing this material");
  await store.updateMaterial(material.id, { visibility, publishedAt: visibility === "published" ? new Date().toISOString() : null });
  return jsonOk({ ...material, visibility, publishedAt: visibility === "published" ? new Date().toISOString() : null });
});
