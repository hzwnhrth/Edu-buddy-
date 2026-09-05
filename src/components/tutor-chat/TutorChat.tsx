"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiOutlineAcademicCap,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlineTrash,
} from "react-icons/hi2";
import { useApiQuery } from "@/lib/hooks/useApi";
import { apiFetch } from "@/lib/profile-client";
import { getActiveMaterialId } from "@/lib/active-material";
import type {
  ChatHistoryResponse,
  ChatRequest,
  ChatResponse,
  MaterialResponse,
} from "@/lib/api-types";
import type { ChatMessage } from "@/lib/types";

const DEFAULT_SUGGESTIONS = [
  "Explain the main concepts from my notes",
  "Give me a summary of what I studied",
  "What should I focus on for an exam?",
];

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

// The AI Tutor chat. Loads the profile's stored history on mount, sends every
// message through /api/chat and keeps the local message list in step with
// what the server stores.
export default function TutorChat() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [suggestions, setSuggestions] =
    useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const historyQuery = useApiQuery<ChatHistoryResponse>("/api/chat");

  // Adopt the stored history exactly once; after that the list is ours and
  // each send appends to it directly.
  useEffect(() => {
    if (historyQuery.data && !historyLoaded) {
      setMessages(historyQuery.data.messages);
      setHistoryLoaded(true);
    }
  }, [historyQuery.data, historyLoaded]);

  // The active material id lives in localStorage, so it can only be read
  // after mount. Its title feeds the context pill.
  useEffect(() => {
    setMaterialId(getActiveMaterialId());
  }, []);

  const materialQuery = useApiQuery<MaterialResponse>(
    materialId ? `/api/materials/${materialId}` : null,
    [materialId]
  );
  const materialTitle = materialQuery.data?.material.title ?? null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (message?: string) => {
    const msg = (message ?? input).trim();
    if (!msg || loading) return;

    const userMessage: ChatMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const body: ChatRequest = {
        message: msg,
        history: messages.slice(-10),
      };
      if (materialId) {
        body.materialId = materialId;
      }
      const response = await apiFetch<ChatResponse>("/api/chat", {
        method: "POST",
        body,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      if (response.suggestions?.length) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I ran into an error: ${toMessage(error)}. Please check that the backend is running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await apiFetch<ChatHistoryResponse>("/api/chat", { method: "DELETE" });
    } catch {
      // The server list is cleared best effort; the screen always empties
      // so the student is never stuck with messages they asked to remove.
    }
    setMessages([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <motion.div
      className="page-container"
      style={{
        height: "calc(100vh - var(--navbar-height))",
        display: "flex",
        flexDirection: "column",
        paddingBottom: "1.5rem",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 style={{ fontSize: "1.75rem" }}>Chat</h1>
          <p>Ask anything about your study material</p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => void handleClear()}
            style={{ borderRadius: "9999px", fontSize: "0.85rem" }}
          >
            <HiOutlineTrash /> Clear
          </button>
        )}
      </div>

      {materialId && (
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "9999px",
            background: "#DCFCE7",
            border: "1px solid rgba(34,197,94,0.2)",
            fontSize: "0.8rem",
            color: "#16A34A",
            marginBottom: "0.75rem",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            alignSelf: "flex-start",
          }}
        >
          <HiOutlineChatBubbleLeftRight />
          {materialTitle
            ? `Study context loaded: ${materialTitle}. Ask questions about your notes.`
            : "Study context loaded. Ask questions about your notes."}
        </motion.div>
      )}

      {/* Messages */}
      <div
        className="chat-messages card"
        style={{
          flex: 1,
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          overflowY: "auto",
        }}
      >
        {messages.length === 0 && historyQuery.loading && (
          <div style={{ margin: "auto" }}>
            <div className="loading-spinner" />
          </div>
        )}
        {messages.length === 0 && !loading && !historyQuery.loading && (
          <motion.div
            className="empty-state"
            style={{ margin: "auto", textAlign: "center" }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "20px",
                background: "#22C55E",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2.25rem",
                color: "#FFFFFF",
                margin: "0 auto 1.25rem auto",
                boxShadow: "0 4px 16px rgba(34,197,94,0.25)",
              }}
            >
              <HiOutlineAcademicCap />
            </div>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                marginBottom: "0.4rem",
                color: "#111827",
              }}
            >
              How can I help you study?
            </h3>
            <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
              Ask me anything about your study material.
            </p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={`chat-message ${msg.role === "user" ? "user" : "assistant"}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              style={{
                display: "flex",
                gap: "0.75rem",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "#22C55E",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(34,197,94,0.2)",
                  }}
                >
                  <HiOutlineAcademicCap />
                </div>
              )}
              <div className="chat-bubble">
                {msg.content.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < msg.content.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div
              className="chat-message assistant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", gap: "0.75rem", alignSelf: "flex-start" }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#22C55E",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                <HiOutlineAcademicCap />
              </div>
              <div
                className="chat-bubble"
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "1rem" }}
              >
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 2 && !historyQuery.loading && (
        <motion.div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            marginTop: "0.5rem",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="btn btn-secondary"
              style={{
                padding: "0.4rem 0.85rem",
                fontSize: "0.8rem",
                borderRadius: "9999px",
              }}
              onClick={() => void handleSend(s)}
            >
              <HiOutlineChatBubbleLeftRight
                style={{ color: "#22C55E", fontSize: "0.85rem" }}
              />{" "}
              {s}
            </button>
          ))}
        </motion.div>
      )}

      {/* Input */}
      <motion.div
        className="chat-input-container"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            padding: 0,
            flexShrink: 0,
          }}
          onClick={() => void handleSend()}
          disabled={!input.trim() || loading}
        >
          <HiOutlinePaperAirplane
            style={{
              fontSize: "1.25rem",
              transform: "rotate(-45deg)",
              marginLeft: "3px",
              marginBottom: "3px",
            }}
          />
        </button>
      </motion.div>
    </motion.div>
  );
}
