// Quiz difficulty level.
export type Difficulty = "easy" | "medium" | "hard";

// Processing state of an uploaded material.
export type MaterialStatus = "processing" | "ready" | "error";

// A topic extracted from a material by the AI layer.
export interface Topic {
  id: string;
  name: string;
  summary: string;
  keyPoints: string[];
}

// An uploaded piece of lecture material and what was learned from it.
export interface Material {
  id: string;
  profileId: string;
  title: string;
  sourceName: string;
  pageCount: number;
  charCount: number;
  status: MaterialStatus;
  topics: Topic[];
  createdAt: string;
}

// One ordered slice of a material's extracted text, stored for later AI passes.
export interface Chunk {
  order: number;
  text: string;
}

// A single quiz question with its answer key, as stored server side.
export interface Question {
  qid: string;
  topicId: string;
  stem: string;
  options: [string, string, string, string];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

// The client-safe view of a Question, with the answer key stripped out.
export type PublicQuestion = Omit<Question, "answerIndex" | "explanation">;

// A generated quiz covering one or more topics of a material.
export interface Quiz {
  id: string;
  profileId: string;
  materialId: string;
  topicIds: string[];
  difficulty: Difficulty;
  questions: Question[];
  createdAt: string;
}

// The learner's choice for one quiz question, plus whether it was correct.
export interface AttemptAnswer {
  qid: string;
  chosenIndex: number;
  correct: boolean;
}

// A completed run through a quiz.
export interface Attempt {
  id: string;
  profileId: string;
  quizId: string;
  materialId: string;
  answers: AttemptAnswer[];
  score: number;
  completedAt: string;
}

// A profile's running mastery record for one topic, across all attempts.
export interface TopicProgress {
  topicId: string;
  materialId: string;
  name: string;
  attempts: number;
  correct: number;
  wrong: number;
  mastery: number;
  lastAttemptAt: string | null;
  weak: boolean;
  explanation: string | null;
  explanationAt: string | null;
}

// The anonymous, browser-held identity that owns materials, quizzes and progress.
export interface Profile {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  latestFeedback: string | null;
  latestFeedbackAt: string | null;
  aiCallsToday: number;
  aiCallsDate: string;
}

// What backends the running app is actually wired to, for display and diagnostics.
export interface RuntimeStatus {
  ai: "gemini" | "mock";
  store: "firestore" | "memory";
  model: string | null;
}
