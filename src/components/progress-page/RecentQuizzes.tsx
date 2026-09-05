"use client";

// The Recent Quizzes card, a port of the reference list: the newest attempts
// with their percent chip, the material title, the correct count and a
// relative date.

import { motion } from "framer-motion";
import type { AttemptSummary } from "@/lib/api-types";
import { formatRelative } from "@/lib/format";

// The reference score bands: green from 70, amber from 50, red below.
function scoreBadge(pct: number) {
  if (pct >= 70) return { bg: "#DCFCE7", color: "#16A34A", border: "rgba(34,197,94,0.2)" };
  if (pct >= 50) return { bg: "#FEF3C7", color: "#D97706", border: "rgba(245,158,11,0.2)" };
  return { bg: "#FEE2E2", color: "#DC2626", border: "rgba(239,68,68,0.2)" };
}

export interface RecentQuizzesProps {
  attempts: AttemptSummary[];
  // Material title for the attempt, or null when no material owns its topics.
  titleFor: (attempt: AttemptSummary) => string | null;
}

export function RecentQuizzes({ attempts, titleFor }: RecentQuizzesProps) {
  return (
    <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", color: "#111827" }}>Recent Quizzes</h2>
      {attempts.length === 0 ? (
        <div className="empty-state" style={{ padding: "2.5rem 1rem" }}>
          <p style={{ color: "#6B7280" }}>No quizzes taken yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {attempts.slice(0, 5).map((attempt, i) => {
            const pct = Math.round(attempt.score * 100);
            const badge = scoreBadge(pct);
            const correct = Math.round(attempt.score * attempt.questionCount);
            const title = titleFor(attempt) ?? `Quiz ${attempts.length - i}`;
            return (
              <div
                key={attempt.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.85rem 1rem",
                  background: "#F9FAFB",
                  borderRadius: "12px",
                  border: "1px solid #F3F4F6",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: badge.bg,
                    color: badge.color,
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    border: `1px solid ${badge.border}`,
                    flexShrink: 0,
                  }}
                >
                  {pct}%
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>{title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                    {correct}/{attempt.questionCount} correct
                  </div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 500 }}>
                  {formatRelative(attempt.completedAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
