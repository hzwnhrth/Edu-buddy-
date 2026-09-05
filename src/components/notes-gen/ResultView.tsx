"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApiMutation, useApiQuery } from "@/lib/hooks/useApi";
import { formatPercent } from "@/lib/format";
import type { MaterialResponse, NotesRequest, NotesResponse } from "@/lib/api-types";
import type { Topic, TopicProgress } from "@/lib/types";

type ResultTab = "notes" | "flashcards" | "key_points";

const TABS: { id: ResultTab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "flashcards", label: "Flashcards" },
  { id: "key_points", label: "Key Points" },
];

export interface ResultViewProps {
  materialId: string;
}

// The study-materials half of the Notes Generator: the Notes / Flashcards /
// Key Points tabs over one POST /api/notes response, plus the material's
// topic list with mastery bars from GET /api/materials/[id].
export function ResultView({ materialId }: ResultViewProps) {
  const materialQuery = useApiQuery<MaterialResponse>(`/api/materials/${materialId}`);
  const {
    run: requestNotes,
    data: notes,
    error: notesError,
    notReady: notesNotReady,
    loading: notesLoading,
  } = useApiMutation<NotesRequest, NotesResponse>("/api/notes");

  const [activeTab, setActiveTab] = useState<ResultTab>("notes");
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  // Asks for the notes exactly once per material. The ref keeps React's
  // development double-invocation of effects from sending a second request;
  // the retry button below calls requestNotes() directly.
  const requestedFor = useRef<string | null>(null);
  useEffect(() => {
    if (requestedFor.current === materialId) return;
    requestedFor.current = materialId;
    void requestNotes({ materialId });
  }, [materialId, requestNotes]);

  function toggleCard(index: number) {
    setFlipped((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  if (!notes) {
    if (notesNotReady) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p style={{ color: "#6B7280", margin: 0 }}>This part is not ready yet.</p>
        </div>
      );
    }
    if (notesError) {
      return (
        <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <p style={{ color: "#DC2626", marginBottom: "1rem" }}>{notesError}</p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ borderRadius: "9999px" }}
            disabled={notesLoading}
            onClick={() => {
              requestedFor.current = materialId;
              void requestNotes({ materialId });
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div className="loading-spinner" style={{ margin: "0 auto 1.5rem auto" }} />
        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.4rem", color: "#111827" }}>
          Processing your study materials...
        </h3>
        <p style={{ color: "#6B7280" }}>Analyzing document structure...</p>
      </div>
    );
  }

  const materialData = materialQuery.data;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
        <div className="tabs" role="tablist" aria-label="Study material views">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "notes" && (
            <div className="card">
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.25rem", color: "#3B82F6" }}>
                {notes.notes.title}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {notes.notes.sections?.map((section, index) => (
                  <div key={index}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem", color: "#111827" }}>
                      {section.heading}
                    </h3>
                    <p style={{ color: "#6B7280", lineHeight: 1.7, fontSize: "0.95rem" }}>
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #E5E7EB" }}>
                <h3 style={{ fontSize: "1.05rem", marginBottom: "1.25rem", color: "#6B7280", fontWeight: 700 }}>
                  Topics in this material
                </h3>
                {materialData ? (
                  materialData.material.topics.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {materialData.material.topics.map((topic) => (
                        <TopicRow
                          key={topic.id}
                          topic={topic}
                          progress={materialData.progress.find((item) => item.topicId === topic.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>
                      This material has no extracted topics.
                    </p>
                  )
                ) : materialQuery.notReady ? (
                  <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>This part is not ready yet.</p>
                ) : materialQuery.error ? (
                  <p style={{ fontSize: "0.85rem", color: "#DC2626" }}>
                    {materialQuery.error}{" "}
                    <button
                      type="button"
                      onClick={materialQuery.reload}
                      style={{
                        border: "none",
                        background: "none",
                        padding: 0,
                        color: "#3B82F6",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontSize: "0.85rem",
                      }}
                    >
                      Try again
                    </button>
                  </p>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "#6B7280" }}>Loading topics...</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "flashcards" && (
            <div className="flashcard-grid">
              {notes.flashcards?.map((card, index) => (
                <div
                  key={index}
                  className={`flashcard ${flipped[index] ? "flipped" : ""}`}
                  onClick={() => toggleCard(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleCard(index);
                    }
                  }}
                >
                  <div className="flashcard-inner">
                    <div className="flashcard-front">
                      <div className="flashcard-label">Question</div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>{card.front}</h3>
                    </div>
                    <div className="flashcard-back">
                      <div className="flashcard-label">Answer</div>
                      <p style={{ fontSize: "0.95rem", color: "#16A34A" }}>{card.back}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "key_points" && (
            <div className="card">
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "1.25rem", color: "#111827" }}>
                Summary & Key Concepts
              </h2>
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ color: "#6B7280", lineHeight: 1.7 }}>{notes.notes.summary}</p>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", color: "#8B5CF6" }}>
                Key Terms
              </h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingLeft: "1.25rem", color: "#6B7280" }}>
                {notes.notes.keyPoints?.map((point, index) => (
                  <li key={index} style={{ lineHeight: 1.6 }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

interface TopicRowProps {
  topic: Topic;
  progress?: TopicProgress;
}

// One topic card in the Notes tab: name, summary and either a mastery bar
// (amber when the topic is weak) or the "Not practised yet" line. The
// progress list comes scoped to this one material, so matching on topicId
// alone is enough.
function TopicRow({ topic, progress }: TopicRowProps) {
  const practised = progress !== undefined && progress.attempts > 0;

  return (
    <div style={{ padding: "1.25rem", background: "#F9FAFB", borderRadius: "12px", border: "1px solid #E5E7EB" }}>
      <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>
        {topic.name}
      </h4>
      <p style={{ fontSize: "0.85rem", color: "#6B7280", marginBottom: practised ? "0.75rem" : 0 }}>
        {topic.summary}
      </p>
      {practised && progress ? (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              marginBottom: "0.4rem",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "#6B7280", fontWeight: 600 }}>
              {formatPercent(progress.mastery)} mastery
            </span>
            {progress.weak && (
              <span
                style={{
                  padding: "0.1rem 0.6rem",
                  borderRadius: "9999px",
                  background: "#FEF3C7",
                  color: "#B45309",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                Weak
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress.mastery * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${topic.name} mastery`}
            style={{ height: "8px", width: "100%", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}
          >
            <div
              style={{
                height: "100%",
                width: formatPercent(progress.mastery),
                borderRadius: "9999px",
                background: progress.weak ? "#F59E0B" : "#22C55E",
              }}
            />
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "#9CA3AF", margin: 0 }}>Not practised yet</p>
      )}
    </div>
  );
}
