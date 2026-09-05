import type { MaterialNotes, Question, Topic } from "@/lib/types";
import { generateJson, lastAnsweredModel, resolveModel } from "@/lib/ai/openrouter/client";
import {
  buildChatTutorPrompt,
  buildExplainTopicPrompt,
  buildExtractTopicsPrompt,
  buildGenerateFeedbackPrompt,
  buildGenerateNotesPrompt,
  buildGenerateQuizPrompt,
  type FeedbackPromptTopic,
} from "@/lib/ai/openrouter/prompts";
import {
  chatSchema,
  explanationSchema,
  feedbackSchema,
  notesSchema,
  quizSchema,
  topicsSchema,
} from "@/lib/ai/schemas";
import { splitIntoChunks, uniqueTopicIds } from "@/lib/ai/text";
import {
  AiError,
  type AiClient,
  type AiDescription,
  type ChatTutorInput,
  type ChatTutorOutput,
  type ExplainTopicInput,
  type ExplainTopicOutput,
  type ExtractTopicsFromPdfInput,
  type ExtractTopicsFromPdfOutput,
  type ExtractTopicsInput,
  type GenerateFeedbackInput,
  type GenerateNotesInput,
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

// The real AI backend: Google Gemma through OpenRouter's REST API (plain
// fetch, no SDK). Route code should never construct this directly, only
// through getAi() in src/lib/ai/index.ts.
export class OpenRouterAi implements AiClient {
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

  // Retired in the OpenRouter client, on purpose and gracefully: the chat
  // completions endpoint used here (POST /api/v1/chat/completions) takes
  // text messages only, and Gemma over OpenRouter has no way to receive the
  // base64 PDF bytes the way the former Gemini client attached them as an
  // inline document part, so a scanned PDF cannot be transcribed any more.
  // Rather than pretend, this throws the AiError below; /api/analyze-pdf
  // turns it into a 503 that shows the student a clear instruction to use a
  // PDF with selectable text or paste the notes. MockAi keeps its fake
  // transcription so the flow still works without a key.
  async extractTopicsFromPdf(input: ExtractTopicsFromPdfInput): Promise<ExtractTopicsFromPdfOutput> {
    // The input is deliberately unused: whatever was uploaded, the answer is
    // the same student-readable retirement message.
    void input;
    throw new AiError(
      "This PDF has no readable text, and the AI service cannot read scanned PDFs. Please upload a PDF with selectable text, or paste your notes instead."
    );
  }

  async generateNotes(input: GenerateNotesInput): Promise<MaterialNotes> {
    const { title, topics, chunks } = input;
    if (topics.length === 0) {
      throw new AiError("No topics were given to build notes from.");
    }

    const prompt = buildGenerateNotesPrompt({
      title,
      notesText: chunks.join("\n\n"),
      topics: topics.map((topic) => ({
        name: topic.name,
        summary: topic.summary,
        keyPoints: topic.keyPoints,
      })),
    });

    return generateJson({ prompt, schema: notesSchema });
  }

  async chatTutor(input: ChatTutorInput): Promise<ChatTutorOutput> {
    const prompt = buildChatTutorPrompt({
      message: input.message,
      contextText: input.contextText,
      history: input.history,
    });

    return generateJson({ prompt, schema: chatSchema });
  }

  async describe(): Promise<AiDescription> {
    // Report the model that actually answered the last call (the chain may
    // have fallen back from the free to the paid Gemma); before any call,
    // the first chain entry is the honest guess.
    return { provider: "openrouter", model: lastAnsweredModel() ?? resolveModel() };
  }
}
