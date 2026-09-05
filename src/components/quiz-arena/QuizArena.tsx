"use client";

import { useEffect, useState } from "react";
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
import type { PublicQuiz } from "@/lib/api-types";
import { QUIZ_BANKS } from "@/content/quiz-banks";
import {
  buildSessionQuestions,
  deckDueCount,
  nextDueLabel,
  saveSchedules,
  schedulesForBank,
} from "@/lib/quiz-bank";
import { scheduleReview, type CardSchedule } from "@/lib/spaced-repetition";

// Quiz Arena: a self-contained spaced-repetition quiz. The student picks a
// topic deck, answers one shuffled question at a time, checks each answer
// against the key, and lands on a local results view. Every answer feeds the
// SM-2-style scheduler, which decides when the question comes back: correct
// answers graduate the interval, wrong answers relearn it in ten minutes.

const QUESTION_COUNTS = [3, 5, 8, 10];

interface LocalResult {
  qid: string;
  stem: string;
  options: string[];
  chosenIndex: number;
  correct: boolean;
  correctAnswerIndex: number;
  explanation: string;
}

interface LocalResults {
  score: number;
  results: LocalResult[];
  topicName: string;
  correct: number;
  total: number;
  weak: boolean;
  nextDue: string;
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
  const [selectedBankId, setSelectedBankId] = useState<string>(QUIZ_BANKS[0].id);
  const [numQuestions, setNumQuestions] = useState(10);
  const [dueByBank, setDueByBank] = useState<Record<string, number>>({});
  const [quiz, setQuiz] = useState<PublicQuiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<CardSchedule[]>([]);
  const [results, setResults] = useState<LocalResults | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Due counts come from localStorage (an external system), so the effect
  // reads it asynchronously and publishes the snapshot from the callback.
  // It refreshes whenever the start screen comes back into view (quiz and
  // results both cleared).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const counts: Record<string, number> = {};
      for (const bank of QUIZ_BANKS) {
        counts[bank.id] = deckDueCount(bank);
      }
      setDueByBank(counts);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [quiz, results]);

  const handleStart = () => {
    const bank = QUIZ_BANKS.find((entry) => entry.id === selectedBankId) ?? QUIZ_BANKS[0];
    const loaded = schedulesForBank(bank);
    const questions = buildSessionQuestions(bank, loaded, numQuestions);
    setSchedules(loaded);
    setQuiz({
      id: `${bank.id}-${Date.now()}`,
      materialId: bank.id,
      topicIds: [bank.topicId],
      difficulty: "medium",
      questions,
      createdAt: new Date().toISOString(),
    });
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResults(null);
    setShowExplanation(false);
  };

  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (selectedOption === null || !quiz) return;

    const question = quiz.questions[currentQ];
    const correct = selectedOption === question.correctAnswerIndex;
    const updatedSchedules = schedules.map((entry) =>
      entry.cardId === question.qid ? scheduleReview(entry, correct ? "good" : "again") : entry
    );
    const newAnswers = [...answers, selectedOption];

    setSchedules(updatedSchedules);
    saveSchedules(quiz.materialId, updatedSchedules);

    if (currentQ < quiz.questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentQ(currentQ + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      return;
    }

    const bank = QUIZ_BANKS.find((entry) => entry.id === quiz.materialId);
    const correctCount = newAnswers.filter((answer, index) => answer === quiz.questions[index].correctAnswerIndex).length;
    const score = correctCount / quiz.questions.length;

    setAnswers(newAnswers);
    setResults({
      score,
      results: quiz.questions.map((entry, index) => ({
        qid: entry.qid,
        stem: entry.stem,
        options: entry.options,
        chosenIndex: newAnswers[index],
        correct: newAnswers[index] === entry.correctAnswerIndex,
        correctAnswerIndex: entry.correctAnswerIndex,
        explanation: entry.explanation,
      })),
      topicName: bank?.topicName ?? bank?.title ?? "Topic",
      correct: correctCount,
      total: quiz.questions.length,
      weak: quiz.questions.length >= 3 && score < 0.6,
      nextDue: nextDueLabel(updatedSchedules),
    });
  };

  const resetQuiz = () => {
    setQuiz(null);
    setCurrentQ(0);
    setAnswers([]);
    setSelectedOption(null);
    setResults(null);
    setShowExplanation(false);
  };

  // Start Screen
  if (!quiz && !results) {
    return (
      <motion.div className="page-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header" style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1>Quiz Arena</h1>
          <p>Pick a topic deck and practise with spaced repetition, Anki-style.</p>
        </div>

        <div style={{ maxWidth: "550px", margin: "0 auto" }}>
          <motion.div className="card" style={{ padding: "2rem" }} initial={{ y: 16 }} animate={{ y: 0 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.85rem", color: "#111827" }}>Select a topic deck</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.75rem" }}>
              {QUIZ_BANKS.map((bank) => {
                const selected = bank.id === selectedBankId;
                const due = dueByBank[bank.id] ?? bank.questions.length;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBankId(bank.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.85rem",
                      padding: "1rem 1.1rem",
                      borderRadius: "14px",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      border: selected ? "2px solid #22C55E" : "2px solid #E5E7EB",
                      background: selected ? "#F0FDF4" : "#FFFFFF",
                      transition: "0.2s ease",
                    }}
                  >
                    <span style={{ fontSize: "1.35rem", color: selected ? "#16A34A" : "#9CA3AF", flexShrink: 0 }}>
                      <HiOutlineBookOpen />
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#9CA3AF" }}>
                        {bank.subject}
                      </span>
                      <span style={{ display: "block", fontWeight: 700, fontSize: "0.95rem", color: "#111827", margin: "0.15rem 0" }}>
                        {bank.title}
                      </span>
                      <span style={{ display: "block", fontSize: "0.8rem", color: "#6B7280" }}>
                        {bank.questions.length} questions · {due} due for review
                      </span>
                    </span>
                    {selected && (
                      <span style={{ fontSize: "1.25rem", color: "#16A34A", flexShrink: 0 }}>
                        <HiOutlineCheckCircle />
                      </span>
                    )}
                  </button>
                );
              })}
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

            <div style={{ textAlign: "center" }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "0.85rem 2.5rem", fontSize: "1rem", borderRadius: "9999px", width: "100%" }}
                onClick={handleStart}
              >
                <HiOutlineLightBulb /> Start Quiz
              </button>
              <p style={{ fontSize: "0.78rem", color: "#9CA3AF", marginTop: "0.6rem" }}>
                Questions and answers are shuffled every round. Reviews are scheduled with spaced repetition.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Results
  if (results) {
    const pct = masteryPercent(results.score);

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
              <div className="score-label">{results.correct}/{results.total}</div>
            </motion.div>

            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem", color: "#111827" }}>
              {verdictText(pct)}
            </h2>
            <p style={{ color: "#6B7280", fontSize: "0.95rem" }}>
              You answered {results.correct} of {results.total} questions correctly.
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              Next review: {results.nextDue}
            </p>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.5rem", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-secondary" onClick={resetQuiz} style={{ borderRadius: "9999px" }}>
                <HiOutlineArrowPath /> Try Again
              </button>
              <button type="button" className="btn btn-primary" onClick={handleStart} style={{ borderRadius: "9999px" }}>
                <HiOutlineArrowPath /> Practise bank again
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
                      <strong style={{ color: "#16A34A" }}>Correct:</strong> {r.options[r.correctAnswerIndex] ?? ""}
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
            <motion.div className="card" style={{ padding: "1.25rem" }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.75rem" }}>
                <p style={{ flex: 1, fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>{results.topicName}</p>
                <span style={{ fontSize: "0.85rem", color: "#6B7280", fontWeight: 600 }}>
                  {results.correct}/{results.total}
                </span>
                {results.weak && <span style={weakBadgeStyle}>Weak</span>}
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${results.topicName} mastery`}
                style={{ height: "8px", background: "#E5E7EB", borderRadius: "9999px", overflow: "hidden" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: results.weak ? "#F59E0B" : "#22C55E",
                    borderRadius: "9999px",
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Quiz in progress. The empty guard keeps the view total if a deck ever
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
