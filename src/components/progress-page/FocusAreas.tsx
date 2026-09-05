"use client";

// The Focus Areas section, our addition in the reference style: one card per
// weak topic, expandable to the plain-language explanation from /api/explain.

import { motion } from "framer-motion";
import type { MeResponse } from "@/lib/api-types";
import { FocusCard } from "./FocusCard";

type ProgressEntry = MeResponse["progress"][number];

export interface FocusAreasProps {
  weakTopics: ProgressEntry[];
  titlesByMaterialId: Map<string, string>;
  // The ?topic= deep-link parameter; that card starts expanded.
  initiallyExpandedTopicId: string | null;
}

export function FocusAreas({ weakTopics, titlesByMaterialId, initiallyExpandedTopicId }: FocusAreasProps) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", color: "#111827" }}>Focus Areas</h2>

      {weakTopics.length === 0 ? (
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="empty-state" style={{ padding: "2rem 1rem" }}>
            <h3>No weak topics yet</h3>
            <p>Take a quiz and any topic that needs work will show up here.</p>
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {weakTopics.map((topic, i) => (
            <FocusCard
              key={topic.topicId}
              topic={topic}
              materialTitle={titlesByMaterialId.get(topic.materialId) ?? null}
              initiallyExpanded={initiallyExpandedTopicId === topic.topicId}
              index={i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
