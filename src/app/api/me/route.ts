import { jsonOk, withProfile } from "@/lib/api";
import type { MeResponse } from "@/lib/api-types";

// GET /api/me: everything the dashboard needs in one call, all scoped to the
// requesting profile.
export const GET = withProfile(async ({ profile, store }) => {
  const materials = await store.listMaterials(profile.id);
  const progress = await store.listTopicProgress(profile.id);
  const attempts = await store.listAttempts(profile.id);

  const averageScore =
    attempts.length === 0
      ? null
      : attempts.reduce((total, attempt) => total + attempt.score, 0) / attempts.length;

  const response: MeResponse = {
    profileId: profile.id,
    materials,
    progress,
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
