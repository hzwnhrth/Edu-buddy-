import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "md" | "lg";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  // When set, the button renders as a Next.js Link to this path instead of
  // a <button> element.
  href?: string;
  children: ReactNode;
}

export type ButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white border border-accent hover:bg-accent/90",
  secondary: "bg-white text-ink border border-border hover:bg-background",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-accent-soft",
};

// py-2.5 (not the more common py-2) so a 16px-line-height button clears the
// 44px minimum tap target from docs/spec.md section 8: 24px line height +
// 2x10px padding + the 1px border on every side = 46px.
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "text-base px-4 py-2.5",
  lg: "text-base px-6 py-3",
};

// Shared action control. Renders a native <button> by default, or a
// Next.js Link when given an href. variant/size/fullWidth/loading are the
// same across both, so callers never need to know which one they got.
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  href,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = loading ? "Please wait" : children;

  if (href) {
    return (
      <Link href={href} className={classes} aria-disabled={loading || disabled}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
