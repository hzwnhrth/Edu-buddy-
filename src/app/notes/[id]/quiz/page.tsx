"use client";

import { use } from "react";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { ErrorNotice, LoadingNotice, NotReadyNotice } from "@/components/status/StateNotice";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiQuery } from "@/lib/hooks/useApi";
import type { QuizResponse } from "@/lib/api-types";

// Reads the quiz id from the ?quiz= search param via the searchParams page
// prop (a Promise in this Next version) rather than the useSearchParams
// hook, so this route stays simple without needing a Suspense boundary: see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md,
// "Reading searchParams and params in Client Components".
export default function QuizPage({ params, searchParams }: PageProps<"/notes/[id]/quiz">) {
  const { id } = use(params);
  const search = use(searchParams);
  const quizId = typeof search.quiz === "string" ? search.quiz : null;

  const { data, error, loading, notReady, reload } = useApiQuery<QuizResponse>(
    quizId ? `/api/quizzes/${quizId}` : null
  );

  return (
    <>
      <PageHeader title="Quiz" subtitle="Answer every question, then submit to see your results." />

      {!quizId ? (
        <EmptyState
          title="No quiz selected"
          text="Start a quiz from your topics to see it here."
          action={<Button href={`/notes/${id}`}>Back to topics</Button>}
        />
      ) : (
        <>
          {loading ? <LoadingNotice label="Loading your quiz..." /> : null}
          {notReady ? <NotReadyNotice /> : null}
          {error ? <ErrorNotice message={error} onRetry={reload} /> : null}
          {data ? <QuizRunner key={data.quiz.id} quiz={data.quiz} materialId={id} /> : null}
        </>
      )}
    </>
  );
}
