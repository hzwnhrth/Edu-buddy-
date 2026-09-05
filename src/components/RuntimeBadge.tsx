"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import type { RuntimeStatus } from "@/lib/types";

// Fetches /api/status on mount and quietly flags when the app is running on
// fallbacks (mock AI, in-memory store) instead of the real backends. Shows
// nothing once both are the real thing, so it disappears in production.
export function RuntimeBadge() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/status")
      .then((response) => (response.ok ? (response.json() as Promise<RuntimeStatus>) : null))
      .then((data) => {
        if (!cancelled && data) {
          setStatus(data);
        }
      })
      .catch(() => {
        // Diagnostics only; if the status call fails there is nothing useful
        // to show, so fail silently.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || (status.ai === "gemini" && status.store === "firestore")) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {status.ai === "mock" ? <Badge tone="warn">Mock AI</Badge> : null}
      {status.store === "memory" ? <Badge tone="warn">Memory store</Badge> : null}
    </div>
  );
}
