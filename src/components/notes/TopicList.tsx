"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPercent } from "@/lib/format";
import type { Topic, TopicProgress } from "@/lib/types";

export interface TopicListProps {
  topics: Topic[];
  selectedIds: Set<string>;
  onToggle: (topicId: string) => void;
  progress: TopicProgress[];
}

// One card per topic: a real checkbox (checked by default, wired by the
// page), a summary, a mastery overview from the profile's progress, and a
// "Show key points" toggle that reveals the rest.
export function TopicList({ topics, selectedIds, onToggle, progress }: TopicListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(topicId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }

  return (
    <ul className="flex flex-col gap-3">
      {topics.map((topic) => {
        const checked = selectedIds.has(topic.id);
        const isExpanded = expanded.has(topic.id);
        const checkboxId = `topic-${topic.id}`;
        const keyPointsId = `topic-${topic.id}-key-points`;
        // The progress list handed to this page comes scoped to this one
        // material (see MaterialResponse in src/lib/api-types.ts), so
        // matching on topicId alone is enough to find this topic's row.
        const topicProgress = progress.find((item) => item.topicId === topic.id);

        return (
          <li key={topic.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={checkboxId}
                  checked={checked}
                  onChange={() => onToggle(topic.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                />
                <label htmlFor={checkboxId} className="flex-1 cursor-pointer">
                  <p className="text-base font-medium text-ink">{topic.name}</p>
                  <p className="mt-1 text-sm text-muted">{topic.summary}</p>
                </label>
              </div>

              {topicProgress && topicProgress.attempts > 0 ? (
                <div className="flex flex-col gap-2 pl-8">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted">{formatPercent(topicProgress.mastery)} mastery</p>
                    {topicProgress.weak ? <Badge tone="warn">Weak</Badge> : null}
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-background"
                    role="progressbar"
                    aria-valuenow={Math.round(topicProgress.mastery * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${topic.name} mastery`}
                  >
                    <div
                      className={`h-full rounded-full ${topicProgress.weak ? "bg-warn" : "bg-accent"}`}
                      style={{ width: formatPercent(topicProgress.mastery) }}
                    />
                  </div>
                </div>
              ) : (
                <p className="pl-8 text-sm text-muted">Not practised yet</p>
              )}

              <button
                type="button"
                onClick={() => toggleExpanded(topic.id)}
                aria-expanded={isExpanded}
                aria-controls={keyPointsId}
                className="self-start rounded text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                {isExpanded ? "Hide key points" : "Show key points"}
              </button>
              {isExpanded ? (
                <ul id={keyPointsId} className="list-disc pl-9 text-sm text-muted">
                  {topic.keyPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
