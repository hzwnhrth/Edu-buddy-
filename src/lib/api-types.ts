import type {
  Attempt,
  ChatMessage,
  Difficulty,
  Flashcard,
  Material,
  MaterialNotes,
  PublicQuestion,
  RuntimeStatus,
  TopicProgress,
} from "@/lib/types";

// Request and response shapes for every API route. Shared by the server
// routes (which must return exactly these shapes) and the browser code
// (which relies on them). Every route except /api/status requires the
// x-profile-id header; see src/lib/api.ts. Every error response is
// ApiErrorResponse with an HTTP status of 400, 404, 429, 500 or 501.

// POST /api/analyze: turn pasted or extracted text into a material with topics.
export interface AnalyzeRequest {
  title: string;
  text: string;
  sourceName?: string;
  pageCount?: number;
}
export interface AnalyzeResponse {
  material: Material;
}

// POST /api/analyze-pdf: scanned-PDF fallback, answers with the same AnalyzeResponse as /api/analyze.
export interface AnalyzePdfRequest {
  title: string;
  pdfBase64: string;
  sourceName?: string;
  pageCount?: number;
}

// GET /api/materials/[id]: one material with its quiz history and progress.
export interface AttemptSummary {
  id: string;
  quizId: string;
  score: number;
  questionCount: number;
  completedAt: string;
  topicIds: string[];
}
export interface MaterialResponse {
  material: Material;
  attempts: AttemptSummary[];
  progress: TopicProgress[];
}

// POST /api/quiz: generate a quiz. GET /api/quizzes/[id]: fetch one again.
export interface QuizRequest {
  materialId: string;
  topicIds?: string[];
  count?: number;
  difficulty?: Difficulty;
  focusWeak?: boolean;
}
export interface PublicQuiz {
  id: string;
  materialId: string;
  topicIds: string[];
  difficulty: Difficulty;
  questions: PublicQuestion[];
  createdAt: string;
}
export interface QuizResponse {
  quiz: PublicQuiz;
}

// POST /api/attempt: grade a finished quiz. GET /api/attempts/[id]: fetch the result again.
export interface AttemptRequest {
  quizId: string;
  answers: { qid: string; chosenIndex: number }[];
}
export interface QuestionResult {
  qid: string;
  topicId: string;
  stem: string;
  options: string[];
  chosenIndex: number;
  correct: boolean;
  answerIndex: number;
  explanation: string;
}
export interface TopicResult {
  topicId: string;
  name: string;
  correct: number;
  total: number;
  mastery: number;
  weak: boolean;
}
export interface AttemptResponse {
  attempt: Attempt;
  results: QuestionResult[];
  topicResults: TopicResult[];
}

// POST /api/explain: plain-language explanation of one topic, cached per profile.
export interface ExplainRequest {
  materialId: string;
  topicId: string;
  refresh?: boolean;
}
export interface ExplainResponse {
  topicId: string;
  name: string;
  explanation: string;
  keyPoints: string[];
  cached: boolean;
}

// POST /api/feedback: a short study plan built from the profile's progress.
export interface FeedbackRequest {
  materialId?: string;
}
export interface FeedbackResponse {
  feedback: string;
  generatedAt: string;
}

// GET /api/me: everything the dashboard needs in one call.
export interface MeStats {
  materials: number;
  quizzesTaken: number;
  averageScore: number | null;
  weakTopics: number;
}
export interface MeResponse {
  profileId: string;
  materials: Material[];
  progress: TopicProgress[];
  // The profile's quiz history, newest first, capped at the 20 most recent.
  attempts: AttemptSummary[];
  latestFeedback: string | null;
  latestFeedbackAt: string | null;
  stats: MeStats;
}

// GET /api/status: which backends are live. No profile header needed.
export type StatusResponse = RuntimeStatus;

// POST /api/notes: study notes for one material, cached on the material
// until refresh asks for them again. The notes body is the cached
// MaterialNotes without its flashcards, which travel as their own field.
export interface NotesRequest {
  materialId: string;
  refresh?: boolean;
}
export interface NotesResponse {
  notes: Omit<MaterialNotes, "flashcards">;
  flashcards: Flashcard[];
  cached: boolean;
}

// POST /api/chat: one AI tutor reply. history is the caller's last 10
// messages; GET /api/chat returns the profile's stored history instead.
export interface ChatRequest {
  message: string;
  materialId?: string;
  history: ChatMessage[];
}
export interface ChatResponse {
  reply: string;
  suggestions: string[];
}
export interface ChatHistoryResponse {
  messages: ChatMessage[];
}

// Shape of every non-2xx response.
export interface ApiErrorResponse {
  error: string;
}
