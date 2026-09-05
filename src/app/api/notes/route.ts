import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { AiError, getAi } from "@/lib/ai";
import { selectChunks } from "@/lib/ai/text";
import { consumeAiCall } from "@/lib/limits";
import type { NotesRequest, NotesResponse } from "@/lib/api-types";
import type { MaterialNotes } from "@/lib/types";

const notesRequestSchema = z.object({
  materialId: z.string().min(1),
  refresh: z.boolean().optional(),
}) satisfies z.ZodType<NotesRequest>;

// The response splits the cached payload: everything but the flashcards
// under "notes", the flashcards as their own field.
function toNotesResponse(notes: MaterialNotes, cached: boolean): NotesResponse {
  const { flashcards, ...notesBody } = notes;
  return { notes: notesBody, flashcards, cached };
}

// POST /api/notes: study notes for one material, generated in one AI call
// and cached on the material document (the way /api/explain caches on
// progress) until refresh: true asks for them again.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, notesRequestSchema);

  const material = await store.getMaterial(body.materialId);
  if (!material || material.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  // The cache lives on the material, so a cached answer costs no AI call
  // and works even when the profile is over its daily cap.
  if (material.notes && !body.refresh) {
    return jsonOk(toNotesResponse(material.notes, true));
  }

  const chunkRecords = await store.getChunks(material.id);
  const selected = selectChunks(
    chunkRecords.map((chunk) => chunk.text),
    material.topics
  );

  await consumeAiCall(profile, store);

  let generated: MaterialNotes;
  try {
    generated = await getAi().generateNotes({
      title: material.title,
      topics: material.topics,
      chunks: selected,
    });
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  await store.updateMaterial(material.id, { notes: generated });

  return jsonOk(toNotesResponse(generated, false));
});
