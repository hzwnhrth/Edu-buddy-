import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "warn";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-background text-muted border border-border",
  accent: "bg-accent-soft text-accent border border-transparent",
  warn: "bg-warn-soft text-warn border border-transparent",
};

// Small status pill. "warn" is reserved for things the learner should
// worry about, like a weak topic or a mock/fallback backend.
export function Badge({ tone = "neutral", children }: BadgeProps) {
  const classes = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${TONE_CLASSES[tone]}`;
  return <span className={classes}>{children}</span>;
}
