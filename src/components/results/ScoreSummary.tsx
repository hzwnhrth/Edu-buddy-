import { Card } from "@/components/ui/Card";
import { formatPercent, formatRelative } from "@/lib/format";

export interface ScoreSummaryProps {
  score: number;
  correctCount: number;
  totalCount: number;
  completedAt: string;
}

export function ScoreSummary({ score, correctCount, totalCount, completedAt }: ScoreSummaryProps) {
  return (
    <Card className="flex flex-col items-center gap-1 text-center">
      <p className="text-4xl font-semibold text-ink">{formatPercent(score)}</p>
      <p className="text-base text-muted">
        {correctCount} of {totalCount} correct
      </p>
      <p className="text-sm text-muted">{formatRelative(completedAt)}</p>
    </Card>
  );
}
