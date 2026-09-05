"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { QuestionReview } from "@/components/results/QuestionReview";
import { ScoreSummary } from "@/components/results/ScoreSummary";
import { TopicBars } from "@/components/results/TopicBars";
import { ErrorNotice, LoadingNotice, NotReadyNotice } from "@/components/status/StateNotice";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiMutation, useApiQuery } from "@/lib/hooks/useApi";
import type { AttemptResponse, QuizRequest, QuizResponse } from "@/lib/api-types";

// Reads the attempt id from the ?attempt= search param the same way the
// quiz screen reads ?quiz=: via the searchParams page prop and React's
// use(), see src/app/notes/[id]/quiz/page.tsx for the reasoning.
export default function ResultsPage({ params, searchParams }: PageProps<"/notes/[id]/results">) {
  const { id } = use(params);
  const search = use(searchParams);
  const attemptId = typeof search.attempt === "string" ? search.attempt : null;
  const router = useRouter();

  const attemptQuery = useApiQuery<AttemptResponse>(
    attemptId ? `/api/attempts/${attemptId}` : null
  );
  const attempt = attemptQuery.data;

  const practiseMutation = useApiMutation<QuizRequest, QuizResponse>("/api/quiz");

  const weakTopics = useMemo(
    () =>
      attempt ? [...attempt.topicResults].filter((topic) => topic.weak).sort((a, b) => a.mastery - b.mastery) : [],
    [attempt]
  );
  const weakestTopicId = weakTopics[0]?.topicId ?? null;

  async function handlePractiseWeak() {
    if (!attempt || weakTopics.length === 0) return;
    const result = await practiseMutation.run({
      materialId: attempt.attempt.materialId,
      topicIds: weakTopics.map((topic) => topic.topicId),
      count: 10,
      focusWeak: true,
    });
    if (result) {
      router.push(`/notes/${id}/quiz?quiz=${result.quiz.id}`);
    }
  }

  return (
    <>
      <PageHeader title="Results" subtitle="See how you did and what to study next." />

      {!attemptId ? (
        <EmptyState
          title="No results selected"
          text="Finish a quiz to see your results here."
          action={<Button href={`/notes/${id}`}>Back to topics</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {attemptQuery.loading ? <LoadingNotice label="Loading your results..." /> : null}
          {attemptQuery.notReady ? <NotReadyNotice /> : null}
          {attemptQuery.error ? (
            <ErrorNotice message={attemptQuery.error} onRetry={attemptQuery.reload} />
          ) : null}

          {attempt ? (
            <>
              <ScoreSummary
                score={attempt.attempt.score}
                correctCount={attempt.results.filter((result) => result.correct).length}
                totalCount={attempt.results.length}
                completedAt={attempt.attempt.completedAt}
              />

              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-ink">Topics</h2>
                <TopicBars topicResults={attempt.topicResults} />
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-ink">Question review</h2>
                <QuestionReview
                  entries={attempt.results.map((result) => ({
                    qid: result.qid,
                    stem: result.stem,
                    options: result.options,
                    result,
                  }))}
                />
              </section>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  {weakestTopicId ? (
                    <Button href={`/study/${attempt.attempt.materialId}/${weakestTopicId}`}>
                      Study weak topics
                    </Button>
                  ) : (
                    <Button disabled>Study weak topics</Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handlePractiseWeak}
                    disabled={weakTopics.length === 0}
                    loading={practiseMutation.loading}
                  >
                    Practise weak topics
                  </Button>
                  <Button variant="ghost" href="/">
                    Dashboard
                  </Button>
                </div>
                {!weakestTopicId ? <p className="text-sm text-muted">No weak topics this time.</p> : null}
                {practiseMutation.notReady ? (
                  <p className="text-sm text-muted">This part is not ready yet.</p>
                ) : null}
                {practiseMutation.error ? (
                  <p className="text-sm text-ink">{practiseMutation.error}</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
