import { z } from "zod";
import { jsonError, jsonOk, parseBody, withProfile } from "@/lib/api";
import { AiError, getAi } from "@/lib/ai";
import { selectChunks } from "@/lib/ai/text";
import { consumeAiCall } from "@/lib/limits";
import { getChatStore } from "@/lib/store/chat";
import type { ChatHistoryResponse, ChatRequest, ChatResponse } from "@/lib/api-types";
import type { ChatMessage } from "@/lib/types";

// Longest chat message accepted, in characters. Chat has no ceiling in
// constants.ts, so this one lives here with the only route that uses it.
const CHAT_MESSAGE_MAX_CHARS = 4000;

// The caller sends its last 10 messages; the server enforces that ceiling.
const MAX_REQUEST_HISTORY = 10;

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(CHAT_MESSAGE_MAX_CHARS),
  materialId: z.string().min(1).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .max(MAX_REQUEST_HISTORY),
}) satisfies z.ZodType<ChatRequest>;

// POST /api/chat: one AI tutor reply with follow-up suggestions, counting
// one AI call. GET /api/chat: the profile's stored history.
export const POST = withProfile(async ({ request, profile, store }) => {
  const body = await parseBody(request, chatRequestSchema);

  // An unknown or foreign materialId is a 404, checked before the AI call
  // so a bad id never burns the daily cap. No materialId means general
  // study help with no notes context.
  let contextText: string | undefined;
  if (body.materialId !== undefined) {
    const material = await store.getMaterial(body.materialId);
    if (!material || material.profileId !== profile.id) {
      return jsonError(404, "Not found");
    }
    const chunkRecords = await store.getChunks(material.id);
    contextText = selectChunks(
      chunkRecords.map((chunk) => chunk.text),
      material.topics
    ).join("\n\n");
  }

  await consumeAiCall(profile, store);

  let reply: string;
  let suggestions: string[];
  try {
    const result = await getAi().chatTutor({
      message: body.message,
      contextText,
      history: body.history,
    });
    reply = result.reply;
    suggestions = result.suggestions;
  } catch (error) {
    if (error instanceof AiError) {
      return jsonError(503, error.message);
    }
    throw error;
  }

  // Appended only once the reply exists, so a failed call never leaves a
  // user message sitting in the history without its answer. The store
  // keeps the last 50 messages.
  const turn: ChatMessage[] = [
    { role: "user", content: body.message },
    { role: "assistant", content: reply },
  ];
  await getChatStore().appendMessages(profile.id, turn);

  const response: ChatResponse = { reply, suggestions };
  return jsonOk(response);
});

export const GET = withProfile(async ({ profile }) => {
  const messages = await getChatStore().getMessages(profile.id);
  const response: ChatHistoryResponse = { messages };
  return jsonOk(response);
});
