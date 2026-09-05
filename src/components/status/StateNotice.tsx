import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// Three small, shared panels every screen uses to cover the "loading",
// "error" and "not ready" states from a single place, built only from the
// existing ui primitives (Card, Button) and design tokens. The fourth state,
// "empty", is different per screen and uses ui/EmptyState directly instead.

export interface LoadingNoticeProps {
  label?: string;
}

export function LoadingNotice({ label = "Loading..." }: LoadingNoticeProps) {
  return (
    <Card role="status" aria-live="polite" className="text-base text-muted">
      {label}
    </Card>
  );
}

export interface NotReadyNoticeProps {
  text?: string;
  action?: ReactNode;
}

// The calm placeholder for a route that answers with the shared
// "Not implemented yet" stub. Never styled as an error: this is expected
// while the API routes are still being built.
export function NotReadyNotice({
  text = "This part is not ready yet.",
  action,
}: NotReadyNoticeProps) {
  return (
    <Card role="status" className="flex flex-col items-start gap-3">
      <p className="text-base text-muted">{text}</p>
      {action}
    </Card>
  );
}

export interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <Card role="alert" className="flex flex-col items-start gap-3">
      <p className="text-base text-ink">{message}</p>
      {onRetry ? (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}
