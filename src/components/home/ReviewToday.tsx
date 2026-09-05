"use client";

// The "Review today" queue, in the reference card style. The queue itself is
// built by buildReviewQueue (weak topics first, then stale ones, at most
// five); this component only renders it. The whole section is hidden by the
// page when the profile has no progress at all.

import Link from "next/link";
import { motion } from "framer-motion";
import type { TopicProgress } from "@/lib/types";
import { buildReviewQueue } from "@/lib/review";
import { pluralize } from "@/lib/format";
import { itemVariants } from "@/components/home/motion-presets";

export interface ReviewTodayProps {
  progress: TopicProgress[];
  now: Date;
}

export function ReviewToday({ progress, now }: ReviewTodayProps) {
  const queue = buildReviewQueue(progress, now);

  return (
    <>
      <motion.div variants={itemVariants} style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Review today</h2>
      </motion.div>
      <motion.div className="card" variants={itemVariants} style={{ marginBottom: "2.5rem" }}>
        {queue.length === 0 ? (
          <p style={{ color: "#6B7280", fontSize: "0.9rem", textAlign: "center", padding: "0.5rem 0" }}>
            Nothing to review today. Take a quiz to keep your topics fresh.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {queue.map((item) => {
              const percent = Math.min(100, Math.max(0, Math.round(item.mastery * 100)));
              const weak = item.reason === "weak";
              const reasonText =
                item.daysSince === null
                  ? "Not practised yet"
                  : `Not practised for ${pluralize(item.daysSince, "day")}`;
              return (
                <div key={`${item.materialId}-${item.topicId}`} style={{
                  display: "flex", alignItems: "center", gap: "0.85rem",
                  padding: "0.85rem 1rem", borderRadius: "12px",
                  background: "#F9FAFB", border: "1px solid #F3F4F6",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827" }}>{item.name}</span>
                      {weak ? (
                        <span style={{
                          background: "#FEF3C7", color: "#D97706", border: "1px solid rgba(245,158,11,0.2)",
                          borderRadius: "9999px", padding: "0.1rem 0.6rem",
                          fontSize: "0.7rem", fontWeight: 800,
                        }}>
                          Weak
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                      {weak ? `${percent}% mastery` : reasonText}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.5rem" }}>
                      <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        aria-label={`${item.name} mastery`}
                        style={{ flex: 1, height: "8px", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}
                      >
                        <div style={{
                          width: `${percent}%`, height: "100%", borderRadius: "9999px",
                          background: weak ? "var(--accent-amber)" : "var(--primary)",
                        }} />
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 500 }}>{percent}%</span>
                    </div>
                  </div>
                  <Link
                    href={`/progress?material=${item.materialId}&topic=${item.topicId}`}
                    className="btn btn-secondary"
                    style={{ fontSize: "0.78rem", padding: "0.45rem 0.9rem", borderRadius: "9999px", flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    Study this topic
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
}
