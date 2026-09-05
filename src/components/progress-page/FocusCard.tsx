"use client";

// One weak topic card in the Focus Areas section: the topic name, the
// material title and a mastery bar are always visible; opening the card asks
// /api/explain for the plain-language explanation, once, with a Regenerate
// button that asks for a fresh copy.

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ExplainRequest, ExplainResponse, MeResponse } from "@/lib/api-types";
import { useApiMutation } from "@/lib/hooks/useApi";
import { formatPercent } from "@/lib/format";

type ProgressEntry = MeResponse["progress"][number];

export interface FocusCardProps {
  topic: ProgressEntry;
  materialTitle: string | null;
  initiallyExpanded: boolean;
  index: number;
}

export function FocusCard({ topic, materialTitle, initiallyExpanded, index }: FocusCardProps) {
  const { materialId, topicId, name, mastery } = topic;
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const explain = useApiMutation<ExplainRequest, ExplainResponse>("/api/explain");
  const { run } = explain;
  // Whether the open action already fired a request, so toggling the card
  // never re-asks for the same explanation.
  const requested = useRef(false);

  useEffect(() => {
    if (expanded && !requested.current) {
      requested.current = true;
      void run({ materialId, topicId });
    }
    // run is stable and the card's ids never change.
  }, [expanded, run, materialId, topicId]);

  function toggle() {
    setExpanded((open) => !open);
  }

  function regenerate() {
    requested.current = true;
    void run({ materialId, topicId, refresh: true });
  }

  const paragraphs = (explain.data?.explanation ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.08 }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          font: "inherit",
          color: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>{name}</span>
          <span
            style={{
              background: "#FEF3C7",
              color: "#D97706",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "9999px",
              padding: "0.15rem 0.6rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Weak
          </span>
        </div>
        {materialTitle ? (
          <div style={{ fontSize: "0.8rem", color: "#6B7280", marginTop: "0.15rem" }}>{materialTitle}</div>
        ) : null}
        <div
          role="progressbar"
          aria-valuenow={Math.round(mastery * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${name} mastery`}
          style={{ height: "8px", background: "#F3F4F6", borderRadius: "9999px", overflow: "hidden", marginTop: "0.6rem" }}
        >
          <div style={{ height: "100%", width: formatPercent(mastery), background: "#F59E0B", borderRadius: "9999px" }} />
        </div>
      </button>

      {expanded ? (
        <div style={{ marginTop: "1rem", borderTop: "1px solid #F3F4F6", paddingTop: "1rem" }}>
          {explain.loading ? (
            <p style={{ fontSize: "0.85rem", color: "#9CA3AF", margin: 0 }}>Writing a plain-language explanation...</p>
          ) : null}
          {explain.data ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {paragraphs.map((paragraph, i) => (
                  <p key={i} style={{ fontSize: "0.85rem", color: "#374151", margin: 0 }}>
                    {paragraph}
                  </p>
                ))}
              </div>
              {explain.data.keyPoints.length > 0 ? (
                <div style={{ marginTop: "0.9rem" }}>
                  <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#111827", marginBottom: "0.4rem" }}>Key points</h3>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "1.25rem",
                      fontSize: "0.85rem",
                      color: "#6B7280",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                    }}
                  >
                    {explain.data.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
          {explain.data || explain.error ? (
            <div style={{ marginTop: "0.9rem" }}>
              <button type="button" className="btn btn-ghost" onClick={regenerate} disabled={explain.loading}>
                {explain.loading ? "Please wait" : "Regenerate"}
              </button>
            </div>
          ) : null}
          {explain.notReady ? <p style={{ fontSize: "0.8rem", color: "#9CA3AF" }}>This part is not ready yet.</p> : null}
          {explain.error ? <p style={{ fontSize: "0.8rem", color: "#EF4444" }}>{explain.error}</p> : null}
        </div>
      ) : null}
    </motion.div>
  );
}
