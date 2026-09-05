import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { QuestionResult } from "@/lib/api-types";

export interface QuestionReviewEntry {
  qid: string;
  stem: string;
  options: string[];
  result: QuestionResult;
}

export interface QuestionReviewProps {
  entries: QuestionReviewEntry[];
}

// Each question starts collapsed, using the native <details> element: fully
// keyboard accessible (focusable, Enter/Space toggles it) with no extra
// script. Correct answers are marked with a badge; the "correct answer" line
// only appears for questions that were missed.
export function QuestionReview({ entries }: QuestionReviewProps) {
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry, index) => {
        const { result } = entry;
        const yourAnswer = entry.options[result.chosenIndex] ?? "No answer recorded";
        const correctAnswer = entry.options[result.answerIndex] ?? "Not available";

        return (
          <li key={entry.qid}>
            <Card>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded text-base font-medium text-ink [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
                      &rsaquo;
                    </span>
                    Question {index + 1}
                  </span>
                  <Badge tone={result.correct ? "accent" : "warn"}>
                    {result.correct ? "Correct" : "Incorrect"}
                  </Badge>
                </summary>
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-base text-ink">{entry.stem}</p>
                  <p className="text-sm text-muted">
                    Your answer: <span className="text-ink">{yourAnswer}</span>
                  </p>
                  {!result.correct ? (
                    <p className="text-sm text-muted">
                      Correct answer: <span className="text-ink">{correctAnswer}</span>
                    </p>
                  ) : null}
                  <p className="text-sm text-muted">{result.explanation}</p>
                </div>
              </details>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
