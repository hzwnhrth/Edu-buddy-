"use client";

// The study feedback block under Recent Activity: the profile's latest study
// plan, with a secondary refresh button that asks /api/feedback for a new
// one and reloads the dashboard data afterwards.

import { motion } from "framer-motion";
import { useApiMutation } from "@/lib/hooks/useApi";
import type { FeedbackRequest, FeedbackResponse } from "@/lib/api-types";
import { itemVariants } from "@/components/home/motion-presets";

export interface FeedbackCardProps {
  feedback: string | null;
  onRefreshed: () => void;
}

export function FeedbackCard({ feedback, onRefreshed }: FeedbackCardProps) {
  const { run, loading, notReady, error } = useApiMutation<FeedbackRequest, FeedbackResponse>("/api/feedback");

  async function handleRefresh() {
    // An empty request: FeedbackRequest has only optional fields, and the
    // route requires a valid JSON body, so {} is the empty body here.
    const result = await run({});
    if (result) {
      onRefreshed();
    }
  }

  return (
    <motion.div className="card" variants={itemVariants}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>Your study plan</h2>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", borderRadius: "9999px" }}
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? "Please wait" : "Refresh study plan"}
        </button>
      </div>
      <p style={{ fontSize: "0.9rem", color: "#6B7280", whiteSpace: "pre-line" }}>
        {feedback ?? "No study plan yet. Take a quiz, then refresh to get one."}
      </p>
      {notReady ? <p style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>This part is not ready yet.</p> : null}
      {error ? <p style={{ fontSize: "0.8rem", color: "#EF4444" }}>{error}</p> : null}
    </motion.div>
  );
}
