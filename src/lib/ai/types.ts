import type {
  ChatMessage,
  Difficulty,
  Material,
  MaterialNotes,
  Question,
  Topic,
  TopicProgress,
} from "@/lib/types";

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

// Input for writing a full set of study notes from one material.
export interface GenerateNotesInput {
  title: string;
  topics: Topic[];
  chunks: string[];
}

// Input for one tutor turn. contextText is the active material's text when
// the student has one open, so the tutor answers from the notes; absent it
// answers as general study help. history is the conversation so far.
export interface ChatTutorInput {
  message: string;
  contextText?: string;
  history: ChatMessage[];
}

// One tutor turn: the reply plus 0 to 3 short follow-up suggestions.
export interface ChatTutorOutput {
  reply: string;
  suggestions: string[];
}

// Which AI backend actually answered, and which model if known. Mirrors the
// ai/model fields of RuntimeStatus but is scoped to the AiClient itself.
export interface AiDescription {
  provider: "openrouter" | "mock";
  model: string | null;
}

// The one interface route code is allowed to depend on. Never import
// OpenRouterAi or MockAi directly outside src/lib/ai; call getAi() instead.
export interface AiClient {
  extractTopics(input: ExtractTopicsInput): Promise<Topic[]>;
  generateQuiz(input: GenerateQuizInput): Promise<Question[]>;
  explainTopic(input: ExplainTopicInput): Promise<ExplainTopicOutput>;
  generateFeedback(input: GenerateFeedbackInput): Promise<string>;
  // Scanned-PDF fallback. The mock fakes a transcription; the OpenRouter
  // client has retired the job (Gemma cannot receive PDF bytes over chat
  // completions) and throws AiError with a student-readable message.
  extractTopicsFromPdf(input: ExtractTopicsFromPdfInput): Promise<ExtractTopicsFromPdfOutput>;
  // Study notes written only from the material: sections, summary, key
  // points and flashcards, cached on the material by /api/notes.
  generateNotes(input: GenerateNotesInput): Promise<MaterialNotes>;
  // One tutor turn: a plain-language reply and follow-up suggestions,
  // answered from the notes when contextText is given.
  chatTutor(input: ChatTutorInput): Promise<ChatTutorOutput>;
  describe(): Promise<AiDescription>;
}

// Thrown for any AI failure: a bad key, a network error, a response that
// never became valid JSON. The message is written so a student can read it
// directly, never a raw SDK error string.
export class AiError extends Error {}
