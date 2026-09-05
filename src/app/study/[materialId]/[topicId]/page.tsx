"use client";

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Explanation } from "@/components/study/Explanation";
import { ErrorNotice, LoadingNotice, NotReadyNotice } from "@/components/status/StateNotice";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiMutation } from "@/lib/hooks/useApi";
import type { ExplainRequest, ExplainResponse, QuizRequest, QuizResponse } from "@/lib/api-types";

// Posts ExplainRequest once per materialId/topicId pair as soon as the page
// mounts (no user action needed to see the explanation). firedRef guards
// against React Strict Mode's dev-only double effect firing a second POST,
// which would otherwise count twice against the daily AI call cap.
export default function StudyPage({ params }: PageProps<"/study/[materialId]/[topicId]">) {
  const { materialId, topicId } = use(params);
  const router = useRouter();

  const explainMutation = useApiMutation<ExplainRequest, ExplainResponse>("/api/explain");
  const practiseMutation = useApiMutation<QuizRequest, QuizResponse>("/api/quiz");

  const firedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${materialId}:${topicId}`;
    if (firedKeyRef.current === key) return;
    firedKeyRef.current = key;
    void explainMutation.run({ materialId, topicId });
    // explainMutation.run has a stable identity for this fixed path/method
    // (see useApiMutation), so it is intentionally left out of the
    // dependency array: including it would not change behaviour, and the
    // firedKeyRef guard is what actually controls "run once per topic".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, topicId]);

  function handleRegenerate() {
    void explainMutation.run({ materialId, topicId, refresh: true });
  }

  function handleRetry() {
    void explainMutation.run({ materialId, topicId });
  }

  async function handlePractise() {
    const result = await practiseMutation.run({
      materialId,
      topicIds: [topicId],
      count: 5,
    });
    if (result) {
      router.push(`/notes/${materialId}/quiz?quiz=${result.quiz.id}`);
    }
  }

  return (
    <>
      <PageHeader
        title={explainMutation.data ? explainMutation.data.name : "Study this topic"}
        subtitle="A plain-language explanation, built from your notes."
      />

      <div className="flex flex-col gap-6">
        {explainMutation.loading && !explainMutation.data ? (
          <LoadingNotice label="Building your explanation..." />
        ) : null}
        {explainMutation.notReady ? <NotReadyNotice /> : null}
        {explainMutation.error ? (
          <ErrorNotice message={explainMutation.error} onRetry={handleRetry} />
        ) : null}

        {explainMutation.data ? (
          <Explanation
            data={explainMutation.data}
            onRegenerate={handleRegenerate}
            regenerating={explainMutation.loading}
          />
        ) : null}

        <div className="flex flex-col items-start gap-2">
          <Button onClick={handlePractise} loading={practiseMutation.loading}>
            Practise this topic
          </Button>
          {practiseMutation.notReady ? (
            <p className="text-sm text-muted">This part is not ready yet.</p>
          ) : null}
          {practiseMutation.error ? <p className="text-sm text-ink">{practiseMutation.error}</p> : null}
        </div>
      </div>
    </>
  );
}
