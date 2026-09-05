import { BadRequestError } from "@/lib/api";
import type { QuestionResult, PublicQuiz, TopicResult } from "@/lib/api-types";
import type { AttemptAnswer, Material, Quiz, Topic, TopicProgress } from "@/lib/types";

// Pure quiz and grading logic shared by the quiz routes. Nothing here touches
// the store or the network, so every function is unit-testable on its own
// (see scripts/test-quiz.ts).

// Strips the answer key (answerIndex, explanation) from every question of a
// stored quiz, leaving the shape that is safe to send to the browser before
// (and after) the quiz has been attempted.
export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    id: quiz.id,
    materialId: quiz.materialId,
    topicIds: quiz.topicIds,
    difficulty: quiz.difficulty,
    questions: quiz.questions.map((question) => ({
      qid: question.qid,
      topicId: question.topicId,
      stem: question.stem,
      options: question.options,
    })),
    createdAt: quiz.createdAt,
  };
}

export interface GradedAnswers {
  results: QuestionResult[];
  score: number;
  attemptAnswers: AttemptAnswer[];
}

// Grades a finished attempt at `quiz` against the raw { qid, chosenIndex }
// answers a client submitted. Throws BadRequestError, with a message safe to
// show back to the caller, when: an answer names a qid that is not in the
// quiz, a qid is answered more than once, chosenIndex is not an integer from
// 0 to 3, or some question in the quiz was never answered.
export function gradeAnswers(
  quiz: Quiz,
  answers: { qid: string; chosenIndex: number }[]
): GradedAnswers {
  const questionByQid = new Map(quiz.questions.map((question) => [question.qid, question]));
  const chosenByQid = new Map<string, number>();

  for (const answer of answers) {
    if (!questionByQid.has(answer.qid)) {
      throw new BadRequestError(`Unknown question id: ${answer.qid}`);
    }
    if (chosenByQid.has(answer.qid)) {
      throw new BadRequestError(`Question ${answer.qid} was answered more than once`);
    }
    if (!Number.isInteger(answer.chosenIndex) || answer.chosenIndex < 0 || answer.chosenIndex > 3) {
      throw new BadRequestError(`chosenIndex for ${answer.qid} must be an integer from 0 to 3`);
    }
    chosenByQid.set(answer.qid, answer.chosenIndex);
  }

  const unanswered = quiz.questions.filter((question) => !chosenByQid.has(question.qid));
  if (unanswered.length > 0) {
    throw new BadRequestError(
      `Missing answers for: ${unanswered.map((question) => question.qid).join(", ")}`
    );
  }

  let correctCount = 0;
  const results: QuestionResult[] = quiz.questions.map((question) => {
    const chosenIndex = chosenByQid.get(question.qid) as number;
    const correct = chosenIndex === question.answerIndex;
    if (correct) correctCount += 1;
    return {
      qid: question.qid,
      topicId: question.topicId,
      stem: question.stem,
      options: question.options,
      chosenIndex,
      correct,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    };
  });

  const attemptAnswers: AttemptAnswer[] = results.map((result) => ({
    qid: result.qid,
    chosenIndex: result.chosenIndex,
    correct: result.correct,
  }));

  const score = quiz.questions.length > 0 ? correctCount / quiz.questions.length : 0;

  return { results, score, attemptAnswers };
}

// Folds one graded attempt's correct/wrong counts on a topic into that
// topic's running progress record. `existing` is null the first time a
// profile is graded on this topic. Mastery and weak are recomputed from the
// updated totals; explanation and explanationAt (owned by /api/explain) are
// carried over unchanged.
export function applyAttemptToProgress(
  existing: TopicProgress | null,
  topic: Topic,
  materialId: string,
  correctDelta: number,
  wrongDelta: number,
  now: string
): TopicProgress {
  const correct = (existing?.correct ?? 0) + correctDelta;
  const wrong = (existing?.wrong ?? 0) + wrongDelta;
  const attempts = (existing?.attempts ?? 0) + correctDelta + wrongDelta;
  const answered = correct + wrong;
  const mastery = answered > 0 ? correct / answered : 0;
  const weak = mastery < 0.6 && answered >= 3;

  return {
    topicId: topic.id,
    materialId,
    name: topic.name,
    attempts,
    correct,
    wrong,
    mastery,
    lastAttemptAt: now,
    weak,
    explanation: existing?.explanation ?? null,
    explanationAt: existing?.explanationAt ?? null,
  };
}

// One row per topic that has at least one question in `quiz`, in the
// material's own topic order. `correct` and `total` count only this
// attempt's questions on that topic (from `results`); `mastery` and `weak`
// come from the already-updated progress records in `progressByTopic`.
export function buildTopicResults(
  quiz: Quiz,
  results: QuestionResult[],
  progressByTopic: Map<string, TopicProgress>,
  material: Material
): TopicResult[] {
  const topicIdsInQuiz = new Set(quiz.questions.map((question) => question.topicId));
  const orderedTopics = material.topics.filter((topic) => topicIdsInQuiz.has(topic.id));

  return orderedTopics.map((topic) => {
    const topicResults = results.filter((result) => result.topicId === topic.id);
    const correct = topicResults.filter((result) => result.correct).length;
    const progress = progressByTopic.get(topic.id) ?? null;

    return {
      topicId: topic.id,
      name: topic.name,
      correct,
      total: topicResults.length,
      mastery: progress?.mastery ?? 0,
      weak: progress?.weak ?? false,
    };
  });
}
