import Link from "next/link";
import type { ReactNode } from "react";
import { RuntimeBadge } from "@/components/RuntimeBadge";

export interface AppShellProps {
  children: ReactNode;
}

// The frame every page sits in: a header with the wordmark, primary nav and
// the runtime badge, then a centered, mobile-first content column.
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-6 sm:gap-8">
            <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
              EduBuddy
            </Link>
            <nav className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="text-base text-muted transition-colors hover:text-ink">
                Dashboard
              </Link>
              <Link
                href="/upload"
                className="text-base text-muted transition-colors hover:text-ink"
              >
                Upload
              </Link>
            </nav>
          </div>
          <RuntimeBadge />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
