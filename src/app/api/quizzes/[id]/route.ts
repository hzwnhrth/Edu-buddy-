import { jsonError, jsonOk, withProfile } from "@/lib/api";
import { toPublicQuiz } from "@/lib/quiz-grading";
import type { QuizResponse } from "@/lib/api-types";

// Fetches a previously generated quiz again, with its answer key stripped
// out, exactly as POST /api/quiz first returned it.
export const GET = withProfile<{ id: string }>(async ({ profile, store, params }) => {
  const quiz = await store.getQuiz(params.id);
  if (!quiz || quiz.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  return jsonOk<QuizResponse>({ quiz: toPublicQuiz(quiz) });
});
