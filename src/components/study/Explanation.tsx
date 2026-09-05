import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ExplainResponse } from "@/lib/api-types";

export interface ExplanationProps {
  data: ExplainResponse;
  onRegenerate: () => void;
  regenerating: boolean;
}

// The plain-language explanation for one topic: name, paragraphs, key
// points, and a ghost "Regenerate" action that asks for a fresh copy.
export function Explanation({ data, onRegenerate, regenerating }: ExplanationProps) {
  const paragraphs = data.explanation
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-ink">{data.name}</h2>
        {data.cached ? <p className="text-sm text-muted">Saved explanation</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-base text-ink">
            {paragraph}
          </p>
        ))}
      </div>

      {data.keyPoints.length > 0 ? (
        <div>
          <h3 className="text-base font-medium text-ink">Key points</h3>
          <ul className="mt-2 list-disc pl-5 text-base text-muted">
            {data.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <Button variant="ghost" onClick={onRegenerate} loading={regenerating}>
          Regenerate
        </Button>
      </div>
    </Card>
  );
}
