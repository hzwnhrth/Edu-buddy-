import type { Part } from "@google/genai";
import type { Question, Topic } from "@/lib/types";
import { generateJson, resolveModel } from "@/lib/ai/gemini/client";
import {
  buildExplainTopicPrompt,
  buildExtractTopicsFromPdfPrompt,
  buildExtractTopicsPrompt,
  buildGenerateFeedbackPrompt,
  buildGenerateQuizPrompt,
  type FeedbackPromptTopic,
} from "@/lib/ai/gemini/prompts";
import { explanationSchema, feedbackSchema, pdfTopicsSchema, quizSchema, topicsSchema } from "@/lib/ai/schemas";
import { splitIntoChunks, uniqueTopicIds } from "@/lib/ai/text";
import {
  AiError,
  type AiClient,
  type AiDescription,
  type ExplainTopicInput,
  type ExplainTopicOutput,
  type ExtractTopicsFromPdfInput,
  type ExtractTopicsFromPdfOutput,
  type ExtractTopicsInput,
  type GenerateFeedbackInput,
  type GenerateQuizInput,
} from "@/lib/ai/types";

// How much of a material's text extractTopics sends on the first pass, when
// no topics exist yet to select relevant chunks by (see src/lib/ai/text.ts
// selectChunks, which needs topics as input and so cannot help here).
const EXTRACT_TOPICS_CHAR_BUDGET = 24000;

function firstChars(chunks: string[], limit: number): string {
  const joined = chunks.join("\n\n");
  return joined.length <= limit ? joined : joined.slice(0, limit);
}

// Turns a validated 4-item options array into the fixed tuple Question
// expects. The schema already enforces exactly 4 items.
function toQuad(options: string[]): [string, string, string, string] {
  return [options[0], options[1], options[2], options[3]];
}

// The schema already enforces 0 to 3; this just narrows the type safely
// instead of asserting it with "as".
function toAnswerIndex(value: number): 0 | 1 | 2 | 3 {
  return value === 0 || value === 1 || value === 2 || value === 3 ? value : 0;
}

// Maps a topicName the model returned back to one of our topic ids: an
// exact case-insensitive match first, then the nearest by lowercase
// inclusion in either direction, then the first topic as a last resort so a
// slightly mangled topicName never drops a question.
function matchTopicId(topicName: string, topics: Topic[]): string {
  const lower = topicName.trim().toLowerCase();

  const exact = topics.find((topic) => topic.name.toLowerCase() === lower);
  if (exact) {
    return exact.id;
  }

  const nearest = topics.find((topic) => {
    const topicLower = topic.name.toLowerCase();
    return topicLower.includes(lower) || lower.includes(topicLower);
  });
  if (nearest) {
    return nearest.id;
  }

  return topics[0].id;
}

// The real AI backend: Gemini through @google/genai. Route code should
// never construct this directly, only through getAi() in src/lib/ai/index.ts.
export class GeminiAi implements AiClient {
  async extractTopics(input: ExtractTopicsInput): Promise<Topic[]> {
    const chunks = splitIntoChunks(input.text);
    const notesText = firstChars(chunks, EXTRACT_TOPICS_CHAR_BUDGET);

    const prompt = buildExtractTopicsPrompt(input.title, notesText);
    const payload = await generateJson({ prompt, schema: topicsSchema });

    const ids = uniqueTopicIds(payload.topics.map((topic) => topic.name));
    return payload.topics.map((topic, index) => ({
      id: ids[index],
      name: topic.name,
      summary: topic.summary,
      keyPoints: topic.keyPoints,
    }));
  }

  async generateQuiz(input: GenerateQuizInput): Promise<Question[]> {
    const { topics, chunks, count, difficulty, focusTopicIds } = input;
    if (topics.length === 0) {
      throw new AiError("No topics were given to build a quiz from.");
    }

    const focusTopicNames = focusTopicIds
      ? topics.filter((topic) => focusTopicIds.includes(topic.id)).map((topic) => topic.name)
      : [];

    const prompt = buildGenerateQuizPrompt({
      notesText: chunks.join("\n\n"),
      topics: topics.map((topic) => ({ name: topic.name, keyPoints: topic.keyPoints })),
      count,
      difficulty,
      focusTopicNames,
    });

    const payload = await generateJson({ prompt, schema: quizSchema });

    return payload.questions.slice(0, count).map((question) => ({
      qid: crypto.randomUUID(),
      topicId: matchTopicId(question.topicName, topics),
      stem: question.stem,
      options: toQuad(question.options),
      answerIndex: toAnswerIndex(question.answerIndex),
      explanation: question.explanation,
    }));
  }

  async explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput> {
    const { topic, chunks, wrongQuestions } = input;

    const prompt = buildExplainTopicPrompt({
      notesText: chunks.join("\n\n"),
      topicName: topic.name,
      summary: topic.summary,
      keyPoints: topic.keyPoints,
      wrongQuestions: wrongQuestions.map((question) => ({
        stem: question.stem,
        options: question.options,
        correctOption: question.options[question.answerIndex],
      })),
    });

    const payload = await generateJson({ prompt, schema: explanationSchema });
    return { explanation: payload.explanation, keyPoints: payload.keyPoints };
  }

  async generateFeedback(input: GenerateFeedbackInput): Promise<string> {
    const { progress, materials } = input;
    const titleByMaterialId = new Map(materials.map((material) => [material.id, material.title]));

    const topics: FeedbackPromptTopic[] = progress.map((entry) => ({
      name: entry.name,
      materialTitle: titleByMaterialId.get(entry.materialId) ?? "your notes",
      mastery: entry.mastery,
      attempts: entry.attempts,
      weak: entry.weak,
    }));

    const prompt = buildGenerateFeedbackPrompt(
      topics,
      materials.map((material) => material.title)
    );
    const payload = await generateJson({ prompt, schema: feedbackSchema });
    return payload.feedback;
  }

  // The PDF is sent as an inline document part alongside the prompt text
  // (see the Part/inlineData citation in gemini/client.ts); Gemini
  // transcribes it and extracts topics from that transcription in the same
  // structured-JSON call.
  async extractTopicsFromPdf(input: ExtractTopicsFromPdfInput): Promise<ExtractTopicsFromPdfOutput> {
    const prompt = buildExtractTopicsFromPdfPrompt(input.title, input.sourceName);
    const pdfPart: Part = { inlineData: { data: input.pdfBase64, mimeType: "application/pdf" } };

    const payload = await generateJson({ prompt, schema: pdfTopicsSchema, parts: [pdfPart] });

    const ids = uniqueTopicIds(payload.topics.map((topic) => topic.name));
    const topics: Topic[] = payload.topics.map((topic, index) => ({
      id: ids[index],
      name: topic.name,
      summary: topic.summary,
      keyPoints: topic.keyPoints,
    }));

    return { text: payload.text, topics };
  }

  async describe(): Promise<AiDescription> {
    return { provider: "gemini", model: await resolveModel() };
  }
}
