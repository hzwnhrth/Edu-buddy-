import { z } from "zod";

// Zod schemas for what the MODEL returns. The model never invents ids: topic
// ids come from uniqueTopicIds() and question ids from crypto.randomUUID(),
// both added by our own client code after validation. These schemas are also
// the source of the JSON Schema sent to Gemini for structured output (see
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

// zod 4 ships JSON Schema conversion built in as z.toJSONSchema(schema, params?),
// exported from node_modules/zod/v4/core/json-schema-processors.d.ts and
// re-exported through node_modules/zod/v4/classic/external.d.ts and the
// package root node_modules/zod/index.d.cts. It defaults to JSON Schema draft
// 2020-12, which covers every property Gemini's responseJsonSchema documents
// as supported (type, properties, required, items, minItems, maxItems,
// minimum, maximum, enum, anyOf, and so on). The one thing it adds that
// Gemini does not document is the root "$schema" key, which we drop here
// since it describes the schema format rather than the data shape.
export function jsonSchemaFor<T>(schema: z.ZodType<T>): Record<string, unknown> {
  const full = z.toJSONSchema(schema) as Record<string, unknown>;
  const rest = { ...full };
  delete rest.$schema;
  return rest;
}
