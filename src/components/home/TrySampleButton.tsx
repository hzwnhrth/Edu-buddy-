"use client";

// The "Try sample notes" button: posts the bundled sample to /api/analyze,
// remembers the new material as the active one and continues to the Notes
// Generator with it selected.

import { useRouter } from "next/navigation";
import { useApiMutation } from "@/lib/hooks/useApi";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/api-types";
import { setActiveMaterialId } from "@/lib/active-material";
import { buildSampleRequest } from "@/components/home/dashboard-helpers";

export function TrySampleButton() {
  const router = useRouter();
  const { run, loading, notReady, error } = useApiMutation<AnalyzeRequest, AnalyzeResponse>("/api/analyze");

  async function handleTrySample() {
    const result = await run(buildSampleRequest());
    if (result) {
      setActiveMaterialId(result.material.id);
      router.push(`/notes?material=${result.material.id}`);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
      <button
        type="button"
        className="btn btn-secondary"
        style={{ borderRadius: "9999px" }}
        onClick={handleTrySample}
        disabled={loading}
      >
        {loading ? "Please wait" : "Try sample notes"}
      </button>
      {notReady ? <p style={{ fontSize: "0.8rem", color: "#9CA3AF", margin: 0 }}>This part is not ready yet.</p> : null}
      {error ? <p style={{ fontSize: "0.8rem", color: "#EF4444", margin: 0 }}>{error}</p> : null}
    </div>
  );
}
