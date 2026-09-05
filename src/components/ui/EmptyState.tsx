import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  text: string;
  action?: ReactNode;
}

// Placeholder for a panel with nothing in it yet: a short title, one line
// of explanation, and an optional action (usually a Button) to fix that.
export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-card px-6 py-12 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-sm text-base text-muted">{text}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
