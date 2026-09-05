"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApiMutation } from "@/lib/hooks/useApi";
import type { AttemptRequest, AttemptResponse, PublicQuiz } from "@/lib/api-types";

export interface QuizRunnerProps {
  quiz: PublicQuiz;
  materialId: string;
}

function joinList(items: number[]): string {
  if (items.length <= 1) return String(items[0] ?? "");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function readStoredAnswers(key: string): Record<string, number> {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

// One question at a time, with answers mirrored to sessionStorage so a
// refresh mid-quiz does not lose progress. Submit only appears on the last
// question, and only works once every question has an answer.
export function QuizRunner({ quiz, materialId }: QuizRunnerProps) {
  const router = useRouter();
  const storageKey = `edubuddy.quiz.${quiz.id}`;

  const [answers, setAnswers] = useState<Record<string, number>>(() => readStoredAnswers(storageKey));
  const [currentIndex, setCurrentIndex] = useState(0);

  const { run, loading, notReady, error } = useApiMutation<AttemptRequest, AttemptResponse>(
    "/api/attempt"
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // Storage can be unavailable (private browsing, quota); answers still
      // work for this session, they just will not survive a refresh.
    }
  }, [answers, storageKey]);

  const total = quiz.questions.length;
  const question = quiz.questions[currentIndex];
  const isLast = currentIndex === total - 1;
  const missing = quiz.questions
    .map((q, index) => (answers[q.qid] === undefined ? index + 1 : null))
    .filter((value): value is number => value !== null);

  function chooseOption(optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [question.qid]: optionIndex }));
  }

  async function handleSubmit() {
    if (missing.length > 0) return;
    const result = await run({
      quizId: quiz.id,
      answers: quiz.questions.map((q) => ({ qid: q.qid, chosenIndex: answers[q.qid] })),
    });
    if (result) {
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // Not essential to clean up; ignore.
      }
      router.push(`/notes/${materialId}/results?attempt=${result.attempt.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          Question {currentIndex + 1} of {total}
        </p>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-background"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Quiz progress"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <p className="text-lg font-medium text-ink">{question.stem}</p>
        <div className="flex flex-col gap-2">
          {question.options.map((option, index) => {
            const selected = answers[question.qid] === index;
            return (
              <button
                key={index}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseOption(index)}
                className={`rounded-card border px-4 py-3 text-left text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  selected
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border bg-card text-ink hover:border-accent"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          disabled={currentIndex === 0}
        >
          Back
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} disabled={missing.length > 0} loading={loading}>
            Submit
          </Button>
        ) : (
          <Button onClick={() => setCurrentIndex((index) => Math.min(total - 1, index + 1))}>
            Next
          </Button>
        )}
      </div>

      {isLast && missing.length > 0 ? (
        <p className="text-sm text-muted">
          {missing.length === 1
            ? `Question ${missing[0]} still needs an answer.`
            : `Questions ${joinList(missing)} still need an answer.`}
        </p>
      ) : null}
      {notReady ? <p className="text-sm text-muted">This part is not ready yet.</p> : null}
      {error ? <p className="text-sm text-ink">{error}</p> : null}
    </div>
  );
}
