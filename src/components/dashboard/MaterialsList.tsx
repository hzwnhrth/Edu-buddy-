import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelative, pluralize } from "@/lib/format";
import type { Material } from "@/lib/types";

export interface MaterialsListProps {
  materials: Material[];
}

// Recent notes, newest first, each linking to its topics screen. The empty
// state only points at the "Upload notes" button above it rather than adding
// a second one, so the screen keeps a single primary action.
export function MaterialsList({ materials }: MaterialsListProps) {
  if (materials.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        text="Upload your lecture notes above to get topics, a quiz and a study plan."
      />
    );
  }

  const sorted = [...materials].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <section aria-label="Your notes" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Your notes</h2>
      <ul className="flex flex-col gap-3">
        {sorted.map((material) => (
          <li key={material.id}>
            <Link
              href={`/notes/${material.id}`}
              className="block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Card className="transition-colors hover:border-accent">
                <p className="text-base font-semibold text-ink">{material.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {pluralize(material.topics.length, "topic")} · {formatRelative(material.createdAt)}
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
