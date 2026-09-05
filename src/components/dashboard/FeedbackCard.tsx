"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiMutation } from "@/lib/hooks/useApi";
import { formatRelative } from "@/lib/format";
import type { FeedbackRequest, FeedbackResponse } from "@/lib/api-types";

export interface FeedbackCardProps {
  feedback: string | null;
  feedbackAt: string | null;
}

// Latest study plan text, or an empty message the first time round. The
// "Refresh study plan" action is secondary: the dashboard's one primary
// button is "Upload notes" in DashboardActions above it.
export function FeedbackCard({ feedback, feedbackAt }: FeedbackCardProps) {
  const [latest, setLatest] = useState({ feedback, feedbackAt });
  const { run, loading, notReady, error } = useApiMutation<FeedbackRequest, FeedbackResponse>(
    "/api/feedback"
  );

  async function handleRefresh() {
    const result = await run({});
    if (result) {
      setLatest({ feedback: result.feedback, feedbackAt: result.generatedAt });
    }
  }

  return (
    <section aria-label="Study feedback" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Study feedback</h2>
      <Card className="flex flex-col gap-3">
        {latest.feedback ? (
          <>
            <p className="text-base text-ink">{latest.feedback}</p>
            {latest.feedbackAt ? (
              <p className="text-sm text-muted">{formatRelative(latest.feedbackAt)}</p>
            ) : null}
          </>
        ) : (
          <p className="text-base text-muted">No study plan yet. Take a quiz, then refresh to get one.</p>
        )}
        <div>
          <Button variant="secondary" onClick={handleRefresh} loading={loading}>
            Refresh study plan
          </Button>
        </div>
        {notReady ? <p className="text-sm text-muted">This part is not ready yet.</p> : null}
        {error ? <p className="text-sm text-ink">{error}</p> : null}
      </Card>
    </section>
  );
}
