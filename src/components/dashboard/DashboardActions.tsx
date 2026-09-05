"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useApiMutation } from "@/lib/hooks/useApi";
import { SAMPLE_NOTES } from "@/content/sample-notes";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/api-types";

// Returns the request body for the bundled sample notes
// (src/content/sample-notes.ts), used by the "Try sample notes" action below.
export function buildSampleRequest(): AnalyzeRequest {
  return {
    title: SAMPLE_NOTES.title,
    text: SAMPLE_NOTES.text,
    sourceName: "sample",
    pageCount: 0,
  };
}

// The two dashboard-level actions: "Upload notes" is the one primary action
// on this screen, "Try sample notes" is secondary. Both post to
// /api/analyze with the shape the route expects.
export function DashboardActions() {
  const router = useRouter();
  const { run, loading, notReady, error } = useApiMutation<AnalyzeRequest, AnalyzeResponse>(
    "/api/analyze"
  );

  async function handleTrySample() {
    const result = await run(buildSampleRequest());
    if (result) {
      router.push(`/notes/${result.material.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3">
        <Button href="/upload">Upload notes</Button>
        <Button variant="secondary" onClick={handleTrySample} loading={loading}>
          Try sample notes
        </Button>
      </div>
      {notReady ? <p className="text-sm text-muted">This part is not ready yet.</p> : null}
      {error ? <p className="text-sm text-ink">{error}</p> : null}
    </div>
  );
}
