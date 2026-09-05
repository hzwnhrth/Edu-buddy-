import { z } from "zod";

// Zod schemas for what the MODEL returns. The model never invents ids: topic
// ids come from uniqueTopicIds() and question ids from crypto.randomUUID(),
// both added by our own client code after validation. These schemas are also
// the source of the JSON Schema sent to the model for structured output (see
// jsonSchemaFor below) and are reused by the mock implementation and the
// smoke test to check that every AI output, real or mock, has the same shape.

// Shared by topicsSchema and pdfTopicsSchema below, so the two never drift apart.
const topicsArraySchema = z
  .array(
    z.object({
      name: z.string().min(2).max(60),
      summary: z.string().min(10).max(220),
      keyPoints: z.array(z.string().min(3).max(160)).min(3).max(5),
    })
  )
  .min(4)
  .max(8);

export const topicsSchema = z.object({
  topics: topicsArraySchema,
});
export type TopicsPayload = z.infer<typeof topicsSchema>;

export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        topicName: z.string().min(1),
        stem: z.string().min(10).max(300),
        options: z.array(z.string().min(1).max(160)).length(4),
        answerIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(10).max(320),
      })
    )
    .min(1),
});
export type QuizPayload = z.infer<typeof quizSchema>;

export const explanationSchema = z.object({
  explanation: z.string().min(300).max(2400),
  keyPoints: z.array(z.string().min(1)).min(3).max(5),
});
export type ExplanationPayload = z.infer<typeof explanationSchema>;

export const feedbackSchema = z.object({
  feedback: z.string().min(200).max(1400),
});
export type FeedbackPayload = z.infer<typeof feedbackSchema>;

// The scanned-PDF job: the notes transcribed as plain text, capped at 30000
// characters, plus the same shape of topics extractTopics returns for that text.
export const pdfTopicsSchema = z.object({
  text: z.string().min(1).max(30000),
  topics: topicsArraySchema,
});
export type PdfTopicsPayload = z.infer<typeof pdfTopicsSchema>;

// The study-notes job: 4 to 8 sections with a heading and a plain-language
// body each, a summary, 5 to 8 key points and 6 to 10 flashcards, all
// written only from the notes. The character limits approximate the spec's
// word limits (section bodies of 80 to 200 words, a 40 to 80 word summary)
// and are deliberately generous, since the model does not enforce string
// lengths in structured output; the app validates with these schemas and
// the mock builds well inside them.
export const notesSchema = z.object({
  title: z.string().min(1).max(160),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1).max(160),
        content: z.string().min(300).max(2000),
      })
    )
    .min(4)
    .max(8),
  summary: z.string().min(150).max(800),
  keyPoints: z.array(z.string().min(3).max(240)).min(5).max(8),
  flashcards: z
    .array(
      z.object({
        front: z.string().min(3).max(300),
        back: z.string().min(1).max(400),
      })
    )
    .min(6)
    .max(10),
});
export type NotesPayload = z.infer<typeof notesSchema>;

// The chat tutor job: one plain-language reply (40 to 150 words, so roughly
// 100 to 1600 characters) plus 0 to 3 short follow-up suggestions.
export const chatSchema = z.object({
  reply: z.string().min(100).max(1600),
  suggestions: z.array(z.string().min(1).max(200)).max(3),
});
export type ChatPayload = z.infer<typeof chatSchema>;

// zod 4 ships JSON Schema conversion built in as z.toJSONSchema(schema, params?),
// exported from node_modules/zod/v4/core/json-schema-processors.d.ts and
// re-exported through node_modules/zod/v4/classic/external.d.ts and the
// package root node_modules/zod/index.d.cts. It defaults to JSON Schema draft
// 2020-12, which covers every property the OpenRouter json_schema response
// format accepts (type, properties, required, items, minItems, maxItems,
// minimum, maximum, enum, anyOf, and so on). The one thing it adds that is
// better dropped is the root "$schema" key, which describes the schema
// format rather than the data shape.
export function jsonSchemaFor<T>(schema: z.ZodType<T>): Record<string, unknown> {
  const full = z.toJSONSchema(schema) as Record<string, unknown>;
  const rest = { ...full };
  delete rest.$schema;
  return rest;
}
