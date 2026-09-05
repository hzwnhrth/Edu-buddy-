import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPercent, formatRelative, pluralize } from "@/lib/format";
import type { AttemptSummary } from "@/lib/api-types";

export interface PastScoresProps {
  materialId: string;
  attempts: AttemptSummary[];
}

// Every past quiz attempt for this material, newest first, each linking to
// its full results.
export function PastScores({ materialId, attempts }: PastScoresProps) {
  if (attempts.length === 0) {
    return <EmptyState title="No quizzes yet" text="Start a quiz above to see your scores here." />;
  }

  const sorted = [...attempts].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((attempt) => (
        <li key={attempt.id}>
          <Link
            href={`/notes/${materialId}/results?attempt=${attempt.id}`}
            className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <Card className="flex items-center justify-between gap-3 transition-colors hover:border-accent">
              <p className="text-base font-medium text-ink">{formatPercent(attempt.score)}</p>
              <p className="text-sm text-muted">
                {pluralize(attempt.questionCount, "question")} · {formatRelative(attempt.completedAt)}
              </p>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
