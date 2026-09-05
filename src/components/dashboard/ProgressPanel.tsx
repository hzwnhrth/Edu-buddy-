import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { MeStats } from "@/lib/api-types";

export interface ProgressPanelProps {
  stats: MeStats;
}

// The overall numbers only. The per-topic weak list that used to live below
// this grid has moved to the dashboard's "Review today" queue
// (src/components/dashboard/ReviewQueue.tsx), which also covers topics that
// have simply gone stale, so a topic is never listed twice on the dashboard.
export function ProgressPanel({ stats }: ProgressPanelProps) {
  return (
    <section aria-label="Your progress" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Your progress</h2>
      <Card>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">Notes</dt>
            <dd className="text-xl font-semibold text-ink">{stats.materials}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Quizzes taken</dt>
            <dd className="text-xl font-semibold text-ink">{stats.quizzesTaken}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Average score</dt>
            <dd className="text-xl font-semibold text-ink">
              {stats.averageScore === null ? "-" : formatPercent(stats.averageScore)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Weak topics</dt>
            <dd className="text-xl font-semibold text-ink">{stats.weakTopics}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
