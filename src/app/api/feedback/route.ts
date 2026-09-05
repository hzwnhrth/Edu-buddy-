import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { AiError, getAi } from "@/lib/ai";
import { consumeAiCall } from "@/lib/limits";
import type { FeedbackRequest, FeedbackResponse } from "@/lib/api-types";

const feedbackRequestSchema = z.object({
  materialId: z.string().min(1).optional(),
}) satisfies z.ZodType<FeedbackRequest>;

// POST /api/feedback: a short study plan built from the profile's progress
// (across every material, or just one when materialId is given), saved on
// the profile so /api/me can show it back without asking the AI again.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, feedbackRequestSchema);

  if (body.materialId !== undefined) {
    const material = await store.getMaterial(body.materialId);
    if (!material || material.profileId !== profile.id) {
      return jsonError(404, "Not found");
    }
  }

  const allProgress = await store.listTopicProgress(profile.id);
  const progress =
    body.materialId === undefined
      ? allProgress
      : allProgress.filter((entry) => entry.materialId === body.materialId);

  const materials = (await store.listMaterials(profile.id)).map((material) => ({
    id: material.id,
    title: material.title,
  }));

  await consumeAiCall(profile, store);

  let feedback: string;
  try {
    feedback = await getAi().generateFeedback({ progress, materials });
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  const generatedAt = new Date().toISOString();
  await store.updateProfile(profile.id, { latestFeedback: feedback, latestFeedbackAt: generatedAt });

  const response: FeedbackResponse = { feedback, generatedAt };
  return jsonOk(response);
});
