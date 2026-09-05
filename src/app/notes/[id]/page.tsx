"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { PastScores } from "@/components/notes/PastScores";
import { TopicList } from "@/components/notes/TopicList";
import { ErrorNotice, LoadingNotice, NotReadyNotice } from "@/components/status/StateNotice";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useApiMutation, useApiQuery } from "@/lib/hooks/useApi";
import type { MaterialResponse, QuizRequest, QuizResponse } from "@/lib/api-types";

// The topics extracted from one material, with a checkbox per topic (all
// selected by default) and past quiz scores below. GET /api/materials/[id]
// carries all of it in one call.
export default function TopicsPage({ params }: PageProps<"/notes/[id]">) {
  const { id } = use(params);
  const router = useRouter();

  const { data, error, loading, notReady, reload } = useApiQuery<MaterialResponse>(
    `/api/materials/${id}`
  );
  const quizMutation = useApiMutation<QuizRequest, QuizResponse>("/api/quiz");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Selects every topic the first time this material's topics arrive, using
  // React's documented render-time "adjust state when a prop changes"
  // pattern instead of an effect (https://react.dev/learn/you-might-not-need-an-effect):
  // there is no external system involved, just a derivation of state that
  // should happen once per material and then leave the user's own toggles
  // alone.
  const [selectedForMaterialId, setSelectedForMaterialId] = useState<string | null>(null);
  if (data && data.material.id !== selectedForMaterialId) {
    setSelectedForMaterialId(data.material.id);
    setSelectedIds(new Set(data.material.topics.map((topic) => topic.id)));
  }

  function toggleTopic(topicId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  async function handleStartQuiz() {
    if (selectedIds.size === 0) return;
    const result = await quizMutation.run({
      materialId: id,
      topicIds: Array.from(selectedIds),
      count: 10,
    });
    if (result) {
      router.push(`/notes/${id}/quiz?quiz=${result.quiz.id}`);
    }
  }

  return (
    <>
      <PageHeader
        title={data ? data.material.title : "Your notes"}
        subtitle="Choose the topics to quiz yourself on."
      />

      {loading ? <LoadingNotice label="Loading your notes..." /> : null}
      {notReady ? <NotReadyNotice /> : null}
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="flex flex-col gap-8">
          {data.material.topics.length === 0 ? (
            <EmptyState title="No topics yet" text="This material has no extracted topics." />
          ) : (
            <section className="flex flex-col gap-4">
              <TopicList
                topics={data.material.topics}
                selectedIds={selectedIds}
                onToggle={toggleTopic}
                progress={data.progress}
              />
              <div className="flex flex-col items-start gap-2">
                <Button
                  onClick={handleStartQuiz}
                  disabled={selectedIds.size === 0}
                  loading={quizMutation.loading}
                >
                  Start quiz
                </Button>
                {selectedIds.size === 0 ? (
                  <p className="text-sm text-muted">Select at least one topic to start a quiz.</p>
                ) : null}
                {quizMutation.notReady ? (
                  <p className="text-sm text-muted">This part is not ready yet.</p>
                ) : null}
                {quizMutation.error ? <p className="text-sm text-ink">{quizMutation.error}</p> : null}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-ink">Past scores</h2>
            <PastScores materialId={id} attempts={data.attempts} />
          </section>
        </div>
      ) : null}
    </>
  );
}
