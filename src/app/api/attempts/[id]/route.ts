import { jsonError, jsonOk, withProfile } from "@/lib/api";
import { buildTopicResults } from "@/lib/quiz-grading";
import type { AttemptResponse, QuestionResult } from "@/lib/api-types";
import type { TopicProgress } from "@/lib/types";

// Fetches a previously graded attempt again, rebuilding the same results and
// topicResults shape POST /api/attempt returned, from the stored answers, the
// quiz's questions, and the profile's current per-topic progress.
//
// Looked up directly through store.getAttempt(id); an attempt that does not
// exist, or exists but belongs to a different profile, is answered as 404
// either way, so a caller can never tell the two cases apart.
export const GET = withProfile<{ id: string }>(async ({ profile, store, params }) => {
  const attempt = await store.getAttempt(params.id);
  if (!attempt || attempt.profileId !== profile.id) {
    return jsonError(404, "Not found");
  }

  const quiz = await store.getQuiz(attempt.quizId);
  if (!quiz) {
    return jsonError(404, "Not found");
  }

  const material = await store.getMaterial(attempt.materialId);
  if (!material) {
    return jsonError(404, "Not found");
  }

  const questionByQid = new Map(quiz.questions.map((question) => [question.qid, question]));
  const results: QuestionResult[] = attempt.answers.map((answer) => {
    const question = questionByQid.get(answer.qid);
    if (!question) {
      throw new Error(`Question ${answer.qid} from attempt ${attempt.id} is missing from quiz ${quiz.id}`);
    }
    return {
      qid: question.qid,
      topicId: question.topicId,
      stem: question.stem,
      options: question.options,
      chosenIndex: answer.chosenIndex,
      correct: answer.correct,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    };
  });

  const topicIdsInQuiz = [...new Set(quiz.questions.map((question) => question.topicId))];
  const progressByTopic = new Map<string, TopicProgress>();
  for (const topicId of topicIdsInQuiz) {
    const progress = await store.getTopicProgress(profile.id, topicId);
    if (progress) {
      progressByTopic.set(topicId, progress);
    }
  }

  const topicResults = buildTopicResults(quiz, results, progressByTopic, material);

  return jsonOk<AttemptResponse>({ attempt, results, topicResults });
});
