import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { TopicResult } from "@/lib/api-types";

export interface TopicBarsProps {
  topicResults: TopicResult[];
}

export function TopicBars({ topicResults }: TopicBarsProps) {
  return (
    <ul className="flex flex-col gap-3">
      {topicResults.map((topic) => (
        <li key={topic.topicId}>
          <Card className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-medium text-ink">{topic.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">
                  {topic.correct}/{topic.total}
                </span>
                {topic.weak ? <Badge tone="warn">Weak</Badge> : null}
              </div>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-background"
              role="progressbar"
              aria-valuenow={Math.round(topic.mastery * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${topic.name} mastery`}
            >
              <div
                className={`h-full rounded-full ${topic.weak ? "bg-warn" : "bg-accent"}`}
                style={{ width: formatPercent(topic.mastery) }}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
