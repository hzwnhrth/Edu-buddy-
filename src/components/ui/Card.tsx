import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

// White surface with a border, rounded corners and padding. The base
// building block for every panel in the app.
export function Card({ className, ...rest }: CardProps) {
  const classes = ["bg-card border border-border rounded-card p-6", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...rest} />;
}
