"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  HiOutlineArrowPath,
  HiOutlineArrowRight,
  HiOutlineBookOpen,
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineLightBulb,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { getActiveMaterialId, setActiveMaterialId } from "@/lib/active-material";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AttemptRequest,
  AttemptResponse,
  MaterialResponse,
  PublicQuiz,
  QuizRequest,
  QuizResponse,
} from "@/lib/api-types";
import type { Difficulty } from "@/lib/types";
import { useApiQuery } from "@/lib/hooks/useApi";
import { apiFetch } from "@/lib/profile-client";
import { TEKS_SEJARAH_T4_BANK, TEKS_SEJARAH_T4_TITLE } from "@/content/teks-sejarah-t4-bank";
import { newCardSchedule, scheduleReview, type CardSchedule } from "@/lib/spaced-repetition";

// Quiz Arena: generates, renders and grades quizzes. The student picks a
// difficulty and a question count, answers one question at a time, checks
// each answer against the key the quiz response carries, and lands on a
// results view with per question detail and per topic mastery.

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; bg: string }> = {
  easy: { label: "Easy", color: "#22C55E", bg: "#DCFCE7" },
  medium: { label: "Medium", color: "#F59E0B", bg: "#FEF3C7" },
  hard: { label: "Hard", color: "#EF4444", bg: "#FEE2E2" },
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const QUESTION_COUNTS = [3, 5, 8, 10];
const NOT_IMPLEMENTED_MESSAGE = "Not implemented yet";

interface LoadingView {
  title: string;
  caption: string;
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

// A route that answers with the 501 stub body is "not ready", not a failure.
function displayError(message: string): string {
  return message === NOT_IMPLEMENTED_MESSAGE ? "This part is not ready yet." : message;
}

function verdictText(pct: number): string {
  if (pct >= 90) return "Excellent!";
  if (pct >= 70) return "Great job!";
  if (pct >= 50) return "Good effort!";
  return "Keep practicing!";
}

function masteryPercent(mastery: number): number {
  return Math.round(mastery * 100);
}

// Mirrors the answers given so far into sessionStorage keyed by the quiz id,
// shaped { qid: chosenIndex } like the old runner stored them. Storage being
// unavailable (private mode, quota) must never break the quiz itself.
function mirrorAnswers(quiz: PublicQuiz, answered: number[]): void {
  try {
    const byQid: Record<string, number> = {};
    quiz.questions.forEach((question, index) => {
      if (index < answered.length) {
        byQid[question.qid] = answered[index];
      }
    });
    window.sessionStorage.setItem(`edubuddy.quiz.${quiz.id}`, JSON.stringify(byQid));
  } catch {
    // The quiz still works for this session without the mirror.
  }
}

function clearMirror(quizId: string): void {
  try {
    window.sessionStorage.removeItem(`edubuddy.quiz.${quizId}`);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

// The active material id is read from localStorage through a tiny store so
// the start screen can render it during hydration (server snapshot: none)
// and refresh the moment the paste flow stores a new id. The module keeps
// the listener list because src/lib/active-material.ts has none of its own.
let activeIdListeners: (() => void)[] = [];

function subscribeActiveId(listener: () => void): () => void {
  activeIdListeners.push(listener);
  return () => {
    activeIdListeners = activeIdListeners.filter((entry) => entry !== listener);
  };
}

function notifyActiveIdListeners(): void {
  for (const listener of activeIdListeners) {
    listener();
  }
}

function getActiveIdSnapshot(): string | null {
  return getActiveMaterialId();
}

function getActiveIdServerSnapshot(): null {
  return null;
}

const errorBoxStyle = {
  color: "#EF4444",
  textAlign: "center",
  margin: "0.75rem 0",
  fontSize: "0.9rem",
  fontWeight: 600,
  background: "#FEE2E2",
  padding: "0.75rem",
  borderRadius: "10px",
} as const;

const weakBadgeStyle = {
  padding: "0.2rem 0.6rem",
  borderRadius: "9999px",
  fontSize: "0.7rem",
  fontWeight: 800,
  background: "#FEF3C7",
  color: "#D97706",
  border: "1px solid rgba(245,158,11,0.2)",
  flexShrink: 0,
} as const;

export function QuizArena() {
  const storedMaterialId = useSyncExternalStore(
    subscribeActiveId,
    getActiveIdSnapshot,
    getActiveIdServerSnapshot
  );
  const [pastedTitle, setPastedTitle] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loadingView, setLoadingView] = useState<LoadingView | null>(null);
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<AttemptResponse | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");
  const [bankMode, setBankMode] = useState(false);
  const [bankSchedules, setBankSchedules] = useState<CardSchedule[]>([]);

  const materialId = storedMaterialId;
  const materialQuery = useApiQuery<MaterialResponse>(
    materialId ? `/api/materials/${materialId}` : null
  );

  // The title comes from the material fetch, or straight from the analyze
  // response while the paste flow's own material is still fresh.
  const materialTitle = pastedTitle ?? materialQuery.data?.material.title ?? null;

  const weakTopics = useMemo(
    () =>
      results
        ? [...results.topicResults].filter((topic) => topic.weak).sort((a, b) => a.mastery - b.mastery)
        : [],
    [results]
  );
  const weakestTopicId = weakTopics[0]?.topicId ?? null;

  const handleStart = async () => {
    if (!materialId && !textInput.trim()) {
      setError("Please paste your study content below, or load notes from the Notes Generator page first.");
      return;
    }
    setError("");
    setLoadingView({
      title: "Generating your quiz...",
      caption: `Creating ${numQuestions} ${difficulty} questions`,
    });
    try {
      // Without an active material the pasted text becomes one first, the
      // same way the Notes Generator does it, and is kept as the active one.
      let id = materialId;
      if (!id) {
        const analyzeBody: AnalyzeRequest = { title: "Pasted Text", text: textInput.trim() };
        const analyzed = await apiFetch<AnalyzeResponse>("/api/analyze", {
          method: "POST",
          body: analyzeBody,
        });
        id = analyzed.material.id;
        setActiveMaterialId(id);
        notifyActiveIdListeners();
        setPastedTitle(analyzed.material.title);
      }
      const quizBody: QuizRequest = { materialId: id, difficulty, count: numQuestions };
      const data = await apiFetch<QuizResponse>("/api/quiz", { method: "POST", body: quizBody });
      setQuiz(data.quiz);
      setCurrentQ(0);
      setAnswers([]);
      setSelectedOption(null);
      setResults(null);
      setShowExplanation(false);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoadingView(null);
    }
  };

  const handleStartHistoryBank = () => {
    let saved: CardSchedule[] = [];
    try {
      const raw = window.localStorage.getItem("edubuddy.srs.teks-sejarah-t4");
      saved = raw ? (JSON.parse(raw) as CardSchedule[]) : [];
    } catch {
      saved = [];
    }
    const schedules = TEKS_SEJARAH_T4_BANK.map((question) =>
      saved.find((card) => card.cardId === question.qid) ?? newCardSchedule(question.qid)
    );
    const dueIds = new Set(schedules.filter((card) => new Date(card.dueAt).getTime() <= Date.now()).map((card) => card.cardId));
    const dueQuestions = TEKS_SEJARAH_T4_BANK.filter((question) => dueIds.has(question.qid));
    const questions = (dueQuestions.length > 0 ? dueQuestions : TEKS_SEJARAH_T4_BANK).slice(0, numQuestions);
    const bankQuiz: PublicQuiz = {
      id: "teks-sejarah-t4-bank",
      materialId: "teks-sejarah-t4",
      topicIds: ["warisan-negara-bangsa"],
      difficulty: "medium",
      questions,
      createdAt: new Date().toISOString(),
    };
    setBankSchedules(schedules);
    setBankMode(true);
    setQuiz(bankQuiz);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResults(null);
    setShowExplanation(false);
    setError("");
  };

  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (selectedOption === null || !quiz) return;

    const newAnswers = [...answers, selectedOption];

    if (bankMode) {
      const card = bankSchedules.find((entry) => entry.cardId === quiz.questions[currentQ].qid);
      if (card) {
        const updated = bankSchedules.map((entry) =>
          entry.cardId === card.cardId ? scheduleReview(card, selectedOption === quiz.questions[currentQ].correctAnswerIndex ? "good" : "again") : entry
        );
        setBankSchedules(updated);
        try {
          window.localStorage.setItem("edubuddy.srs.teks-sejarah-t4", JSON.stringify(updated));
        } catch {
          // The bank remains usable when browser storage is unavailable.
        }
      }
      if (currentQ < quiz.questions.length - 1) {
        setAnswers(newAnswers);
        setCurrentQ(currentQ + 1);
        setSelectedOption(null);
        setShowExplanation(false);
        return;
      }
      const correctCount = newAnswers.filter((answer, index) => answer === quiz.questions[index].correctAnswerIndex).length;
      setAnswers(newAnswers);
      setResults({
        attempt: { id: `local-${Date.now()}`, profileId: "local", quizId: quiz.id, materialId: quiz.materialId, answers: quiz.questions.map((question, index) => ({ qid: question.qid, chosenIndex: newAnswers[index], correct: newAnswers[index] === question.correctAnswerIndex })), score: correctCount / quiz.questions.length, completedAt: new Date().toISOString() },
        results: quiz.questions.map((question, index) => ({ qid: question.qid, topicId: question.topicId, stem: question.stem, options: question.options, chosenIndex: newAnswers[index], correct: newAnswers[index] === question.correctAnswerIndex, answerIndex: question.correctAnswerIndex, explanation: question.explanation })),
        topicResults: [{ topicId: "warisan-negara-bangsa", name: "Warisan Negara Bangsa", correct: correctCount, total: quiz.questions.length, mastery: correctCount / quiz.questions.length, weak: correctCount / quiz.questions.length < 0.6 }],
      });
      return;
    }

    if (currentQ < quiz.questions.length - 1) {
      setAnswers(newAnswers);
      mirrorAnswers(quiz, newAnswers);
      setCurrentQ(currentQ + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      return;
    }

    // The last answer is only committed once grading accepted it, so a
    // failed submit leaves Finish Quiz working as a clean retry.
    setError("");
    setLoadingView({ title: "Grading your answers...", caption: "One moment while we check your work" });
    try {
      const body: AttemptRequest = {
        quizId: quiz.id,
        answers: quiz.questions.map((question, index) => ({
          qid: question.qid,
          chosenIndex: newAnswers[index],
        })),
      };
      const graded = await apiFetch<AttemptResponse>("/api/attempt", { method: "POST", body });
      setAnswers(newAnswers);
      clearMirror(quiz.id);
      setResults(graded);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoadingView(null);
    }
  };

  const handlePractiseWeak = async () => {
    if (!results || weakTopics.length === 0) return;
    setError("");
    setLoadingView({
      title: "Generating your quiz...",
      caption: "Focusing on your weak topics",
    });
    try {
      const body: QuizRequest = {
        materialId: results.attempt.materialId,
        topicIds: weakTopics.map((topic) => topic.topicId),
        focusWeak: true,
      };
      const data = await apiFetch<QuizResponse>("/api/quiz", { method: "POST", body });
      setQuiz(data.quiz);
      setCurrentQ(0);
      setAnswers([]);
      setSelectedOption(null);
      setResults(null);
      setShowExplanation(false);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoadingView(null);
    }
  };

  const resetQuiz = () => {
    setQuiz(null);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResults(null);
    setShowExplanation(false);
    setError("");
    setBankMode(false);
  };

  const showMaterialError = Boolean(materialId && materialQuery.error);
  const materialError = materialQuery.error ? displayError(materialQuery.error) : "";

  // Start Screen
  if (!quiz && !loadingView && !results) {
    return (
      <motion.div className="page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header" style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1>Quiz Arena</h1>
          <p>Test your knowledge with AI-generated quizzes. Choose your difficulty!</p>
        </div>

        <div style={{ maxWidth: "550px", margin: "0 auto" }}>
          {!materialId && (
            <motion.div className="card" style={{ marginBottom: "1.25rem", padding: "1.5rem" }} initial={{ y: 16 }} animate={{ y: 0 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.6rem", color: "#111827" }}>Paste your study content</h3>
              <textarea
                className="input-glass"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your study material here to generate a quiz..."
                style={{ minHeight: "110px" }}
              />
              <p style={{ fontSize: "0.8rem", color: "#9CA3AF", marginTop: "0.6rem" }}>
                Tip: Generate notes first from the Notes Generator page; they are automatically used here.
              </p>
            </motion.div>
          )}

          {materialId && showMaterialError && (
            <motion.div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem", textAlign: "center" }} initial={{ y: 16 }} animate={{ y: 0 }}>
              <div style={{ color: "#EF4444", fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                ⚠️ {materialError}
              </div>
              <button type="button" className="btn btn-secondary" onClick={materialQuery.reload}>
                <HiOutlineArrowPath /> Try again
              </button>
            </motion.div>
          )}

          {materialId && !showMaterialError && (
            <motion.div
              className="card"
              style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", border: "1px solid rgba(34,197,94,0.3)", background: "#DCFCE7" }}
              initial={{ y: 16 }}
              animate={{ y: 0 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#16A34A", fontSize: "0.85rem", fontWeight: 700 }}>
                ✅ {materialTitle ? `Study content loaded: ${materialTitle}` : "Study content loaded"}
              </div>
            </motion.div>
          )}

          <motion.div className="card" style={{ padding: "2rem" }} initial={{ y: 16 }} animate={{ y: 0 }} transition={{ delay: 0.1 }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.85rem", textAlign: "center", color: "#111827" }}>Select Difficulty</h3>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
                    style={{
                      flex: 1,
                      padding: "0.65rem 1rem",
                      borderRadius: "12px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      border: difficulty === d ? `2px solid ${DIFFICULTY_CONFIG[d].color}` : "2px solid #E5E7EB",
                      background: difficulty === d ? DIFFICULTY_CONFIG[d].bg : "#FFFFFF",
                      color: difficulty === d ? DIFFICULTY_CONFIG[d].color : "#6B7280",
                      fontFamily: "inherit",
                      transition: "0.2s ease",
                    }}
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "1.75rem", textAlign: "center" }}>
              <label style={{ fontSize: "0.9rem", color: "#6B7280", marginRight: "0.75rem", fontWeight: 600 }}>
                Questions:
              </label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                style={{
                  padding: "0.6rem 1.25rem", borderRadius: "9999px",
                  background: "#F9FAFB", border: "1px solid #E5E7EB",
                  color: "#111827", fontFamily: "inherit", fontSize: "0.9rem", outline: "none",
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                {QUESTION_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {error && (
              <div style={errorBoxStyle}>
                ⚠️ {displayError(error)}
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.85rem 2.5rem", fontSize: "1rem", borderRadius: "9999px", width: "100%" }}
                onClick={handleStart}
                disabled={!materialId && !textInput.trim()}
              >
                <HiOutlineLightBulb /> Start Quiz
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleStartHistoryBank}
                style={{ width: "100%", marginTop: "0.75rem", borderRadius: "9999px" }}
              >
                <HiOutlineBookOpen /> Practise {TEKS_SEJARAH_T4_TITLE}
              </button>
              <p style={{ fontSize: "0.78rem", color: "#9CA3AF", marginTop: "0.6rem" }}>
                Reviews are scheduled automatically using spaced repetition.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Loading
  if (loadingView) {
    return (
      <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <motion.div className="card" style={{ textAlign: "center", padding: "3.5rem 2.5rem" }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="loading-spinner" style={{ margin: "0 auto 1.5rem auto" }} />
          <h3 style={{ fontSize: "1.15rem", marginBottom: "0.35rem", color: "#111827" }}>{loadingView.title}</h3>
          <p style={{ color: "#6B7280" }}>{loadingView.caption}</p>
        </motion.div>
      </div>
    );
  }

  // Results
  if (results) {
    const pct = masteryPercent(results.attempt.score);
    const correctCount = results.results.filter((r) => r.correct).length;
    const totalCount = results.results.length;

    return (
      <motion.div className="page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div style={{ maxWidth: "750px", margin: "0 auto" }}>
          <div className="card" style={{ textAlign: "center", padding: "2.5rem", marginBottom: "1.5rem" }}>
            <motion.div
              className="score-circle"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
            >
              <div className="score-value">{pct}%</div>
              <div className="score-label">{correctCount}/{totalCount}</div>
            </motion.div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem", color: "#111827" }}>
              {verdictText(pct)}
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.95rem" }}>
              You answered {correctCount} of {totalCount} questions correctly.
            </p>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
              <button type="button" className="btn btn-primary" onClick={resetQuiz} style={{ borderRadius: "9999px" }}>
                <HiOutlineArrowPath /> Try Again
              </button>
            </div>
          </div>

          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1rem", color: "#6B7280" }}>Detailed Results</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {results.results.map((r, i) => (
              <motion.div key={r.qid} className="card" style={{ padding: "1.25rem" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
                  <span style={{ fontSize: "1.35rem", marginTop: "-0.15rem", color: r.correct ? "#22C55E" : "#EF4444" }}>
                    {r.correct ? <HiOutlineCheckCircle /> : <HiOutlineXCircle />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.6rem", color: "#111827" }}>{r.stem}</p>
                    {!r.correct && (
                      <div style={{ padding: "0.6rem 0.85rem", background: "#FEE2E2", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", marginBottom: "0.4rem", color: "#6B7280", fontSize: "0.85rem" }}>
                        <strong style={{ color: "#EF4444" }}>Your answer:</strong> {r.options[r.chosenIndex] ?? ""}
                      </div>
                    )}
                    <div style={{ padding: "0.6rem 0.85rem", background: "#DCFCE7", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", marginBottom: "0.75rem", color: "#6B7280", fontSize: "0.85rem" }}>
                      <strong style={{ color: "#16A34A" }}>Correct:</strong> {r.options[r.answerIndex] ?? ""}
                    </div>
                    {r.explanation ? (
                      <div style={{ fontSize: "0.85rem", color: "#6B7280", lineHeight: 1.6 }}>
                        {r.explanation}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "1.75rem 0 1rem 0", color: "#6B7280" }}>Topics</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {results.topicResults.map((topic, i) => (
              <motion.div key={topic.topicId} className="card" style={{ padding: "1.25rem" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.75rem" }}>
                  <p style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{topic.name}</p>
                  <span style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600 }}>
                    {topic.correct}/{topic.total}
                  </span>
                  {topic.weak && <span style={weakBadgeStyle}>Weak</span>}
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={masteryPercent(topic.mastery)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${topic.name} mastery`}
                  style={{ height: "8px", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${masteryPercent(topic.mastery)}%`,
                      background: topic.weak ? "#F59E0B" : "#22C55E",
                      borderRadius: "9999px",
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {error && (
            <div style={{ ...errorBoxStyle, marginTop: "1.25rem" }}>
              ⚠️ {displayError(error)}
              <div style={{ marginTop: "0.75rem" }}>
                <button type="button" className="btn btn-secondary" onClick={handlePractiseWeak} disabled={weakTopics.length === 0}>
                  <HiOutlineArrowPath /> Try again
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem" }}>
            {weakestTopicId ? (
              <Link
                href={`/progress?material=${results.attempt.materialId}&topic=${weakestTopicId}`}
                className="btn btn-primary"
                style={{ borderRadius: "9999px" }}
              >
                <HiOutlineBookOpen /> Study weak topics
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" disabled style={{ borderRadius: "9999px" }}>
                <HiOutlineBookOpen /> Study weak topics
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePractiseWeak}
              disabled={weakTopics.length === 0}
              style={{ borderRadius: "9999px" }}
            >
              <HiOutlineArrowPath /> Practise weak topics
            </button>
          </div>
          {weakTopics.length === 0 && (
            <p style={{ textAlign: "center", fontSize: "0.85rem", color: "#9CA3AF", marginTop: "0.6rem" }}>
              No weak topics this time.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  // Quiz in progress. The empty guard keeps the view total if a quiz ever
  // arrives without questions.
  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div className="card" style={{ textAlign: "center", padding: "3.5rem 2.5rem" }}>
          <h3 style={{ fontSize: "1.15rem", marginBottom: "0.35rem", color: "#111827" }}>This quiz has no questions.</h3>
          <button type="button" className="btn btn-secondary" onClick={resetQuiz} style={{ borderRadius: "9999px", marginTop: "0.75rem" }}>
            <HiOutlineArrowPath /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQ];
  const progress = ((currentQ + 1) / quiz.questions.length) * 100;
  const correctIndex = question.correctAnswerIndex;

  return (
    <div className="page-container">
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>
        {error && (
          <div className="card" style={{ padding: "1.25rem", marginBottom: "1.25rem", textAlign: "center" }}>
            <div style={errorBoxStyle}>
              ⚠️ {displayError(error)}
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setError("")} style={{ borderRadius: "9999px" }}>
              <HiOutlineArrowPath /> Try again
            </button>
          </div>
        )}

        {/* Progress Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ flex: 1, height: "8px", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: "linear-gradient(90deg, #22C55E, #3B82F6)", borderRadius: "9999px" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <div style={{ fontWeight: 700, color: "#6B7280", fontSize: "0.9rem" }}>
            {currentQ + 1}/{quiz.questions.length}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            className="card"
            style={{ padding: "2.5rem" }}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.75rem", lineHeight: 1.5, color: "#111827" }}>
              {question.stem}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {question.options.map((option, i) => {
                let className = "quiz-option";

                if (showExplanation) {
                  if (correctIndex !== undefined && i === correctIndex) {
                    className += " correct";
                  } else if (i === selectedOption) {
                    className += " incorrect";
                  }
                } else if (i === selectedOption) {
                  className += " selected";
                }

                return (
                  <motion.button
                    whileHover={!showExplanation ? { scale: 1.01 } : {}}
                    whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    key={i}
                    type="button"
                    className={className}
                    onClick={() => handleSelectOption(i)}
                  >
                    <span className="quiz-option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span style={{ textAlign: "left", fontWeight: selectedOption === i ? 700 : 500 }}>{option}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {showExplanation && question.explanation ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  style={{ marginTop: "1.5rem", padding: "1rem", background: "#F0FDF4", borderRadius: "10px", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <p style={{ color: "#6B7280", fontSize: "0.9rem", lineHeight: 1.6 }}>
                    <span style={{ color: "#16A34A", fontWeight: 700, marginRight: "0.4rem" }}>Explanation:</span>
                    {question.explanation}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.75rem" }}>
              {!showExplanation ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCheckAnswer}
                  disabled={selectedOption === null}
                  style={{ borderRadius: "9999px" }}
                >
                  Check Answer
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
                disabled={selectedOption === null}
                style={{ borderRadius: "9999px" }}
              >
                {currentQ < quiz.questions.length - 1 ? (
                  <><HiOutlineArrowRight /> Next</>
                ) : (
                  <><HiOutlineCheck /> Finish Quiz</>
                )}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
