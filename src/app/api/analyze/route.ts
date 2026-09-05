import { z } from "zod";
import { AiError, getAi } from "@/lib/ai";
import { splitIntoChunks } from "@/lib/ai/text";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { consumeAiCall, MAX_SOURCE_NAME_CHARS, MAX_TEXT_CHARS, MAX_TITLE_CHARS } from "@/lib/limits";
import type { AnalyzeResponse } from "@/lib/api-types";

// Turns pasted or PDF-extracted text into a stored material with topics.
const analyzeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(MAX_TITLE_CHARS, `Title must be ${MAX_TITLE_CHARS} characters or fewer`),
  text: z
    .string()
    .min(1, "Notes text is required")
    .max(MAX_TEXT_CHARS, `Notes text must be ${MAX_TEXT_CHARS} characters or fewer`),
  sourceName: z
    .string()
    .max(MAX_SOURCE_NAME_CHARS, `Source name must be ${MAX_SOURCE_NAME_CHARS} characters or fewer`)
    .optional(),
  pageCount: z.number().int().min(0).optional(),
});

export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, analyzeSchema);

  if (body.text.trim().length === 0) {
    return jsonError(400, "Notes text cannot be empty");
  }

  await consumeAiCall(profile, store);

  const chunks = splitIntoChunks(body.text);

  let topics;
  try {
    topics = await getAi().extractTopics({ title: body.title, text: body.text });
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  const material = await store.createMaterial(
    {
      profileId: profile.id,
      title: body.title,
      sourceName: body.sourceName ?? "pasted",
      pageCount: body.pageCount ?? 0,
      charCount: body.text.length,
      status: "ready",
      topics,
      createdAt: new Date().toISOString(),
    },
    chunks.map((text, order) => ({ order, text }))
  );

  return jsonOk<AnalyzeResponse>({ material }, 201);
});
