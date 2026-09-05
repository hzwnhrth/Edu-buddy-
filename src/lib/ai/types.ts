import type { Difficulty, Material, Question, Topic, TopicProgress } from "@/lib/types";

// Input for turning raw notes into topics.
export interface ExtractTopicsInput {
  title: string;
  text: string;
}

// Input for building a multiple-choice quiz from already-extracted topics.
export interface GenerateQuizInput {
  topics: Topic[];
  chunks: string[];
  count: number;
  difficulty: Difficulty;
  focusTopicIds?: string[];
}

// Input for explaining one topic to a student who got it wrong.
export interface ExplainTopicInput {
  topic: Topic;
  chunks: string[];
  wrongQuestions: Question[];
}

// A plain-language explanation of one topic.
export interface ExplainTopicOutput {
  explanation: string;
  keyPoints: string[];
}

// Input for the short study plan shown on the dashboard.
export interface GenerateFeedbackInput {
  progress: TopicProgress[];
  materials: Pick<Material, "id" | "title">[];
}

// Input for reading a scanned PDF that has no extractable text layer.
export interface ExtractTopicsFromPdfInput {
  title: string;
  pdfBase64: string;
  sourceName: string;
}

// The PDF transcribed as plain text, plus the topics extracted from that text.
export interface ExtractTopicsFromPdfOutput {
  text: string;
  topics: Topic[];
}

// Which AI backend actually answered, and which model if known. Mirrors the
// ai/model fields of RuntimeStatus but is scoped to the AiClient itself.
export interface AiDescription {
  provider: "gemini" | "mock";
  model: string | null;
}

// The one interface route code is allowed to depend on. Never import
// GeminiAi or MockAi directly outside src/lib/ai; call getAi() instead.
export interface AiClient {
  extractTopics(input: ExtractTopicsInput): Promise<Topic[]>;
  generateQuiz(input: GenerateQuizInput): Promise<Question[]>;
  explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput>;
  generateFeedback(input: GenerateFeedbackInput): Promise<string>;
  // The PDF goes to the model as a document; the model transcribes it as
  // plain text and extracts the topics from that transcription.
  extractTopicsFromPdf(input: ExtractTopicsFromPdfInput): Promise<ExtractTopicsFromPdfOutput>;
  describe(): Promise<AiDescription>;
}

// Thrown for any AI failure: a bad key, a network error, a response that
// never became valid JSON. The message is written so a student can read it
// directly, never a raw SDK error string.
export class AiError extends Error {}
