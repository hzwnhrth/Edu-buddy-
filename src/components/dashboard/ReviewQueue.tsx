import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import { buildReviewQueue } from "@/lib/review";
import type { TopicProgress } from "@/lib/types";

export interface ReviewQueueProps {
  progress: TopicProgress[];
}

// At most five topics to work on right now: weak topics first, then topics
// that have gone stale. Replaces the old weak-topic list that used to live
// in ProgressPanel, so a topic is never listed twice on the dashboard. Not
// rendered at all when there is no progress yet; with progress but nothing
// due, it says so in one line instead of showing an empty list.
export function ReviewQueue({ progress }: ReviewQueueProps) {
  if (progress.length === 0) {
    return null;
  }

  const items = buildReviewQueue(progress, new Date());

  return (
    <section aria-label="Review today" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Review today</h2>
      {items.length === 0 ? (
        <Card className="text-base text-muted">
          Nothing to review today. Take a quiz to keep your topics fresh.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={`${item.materialId}-${item.topicId}`}>
              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-medium text-ink">{item.name}</p>
                  {item.reason === "weak" ? (
                    <Badge tone="warn">Weak</Badge>
                  ) : (
                    <p className="text-sm text-muted">
                      {item.daysSince === null
                        ? "Not practised yet"
                        : `Not practised for ${item.daysSince} days`}
                    </p>
                  )}
                </div>
                {item.attempts > 0 ? (
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-background"
                    role="progressbar"
                    aria-valuenow={Math.round(item.mastery * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${item.name} mastery`}
                  >
                    <div
                      className={`h-full rounded-full ${item.reason === "weak" ? "bg-warn" : "bg-accent"}`}
                      style={{ width: formatPercent(item.mastery) }}
                    />
                  </div>
                ) : null}
                <Link
                  href={`/study/${item.materialId}/${item.topicId}`}
                  className="self-start rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Study this topic
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
