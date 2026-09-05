"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";

export interface AppShellProps {
  children: ReactNode;
}

// Port of the reference App.jsx layout. The landing route renders bare, every
// other route sits in the app frame: fixed sidebar, fixed navbar and a content
// column offset by both. The sidebar slides in on small screens, so the shell
// owns its open state, the navbar toggles it and clicking any nav item closes it.
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <main className="main-content">{children}</main>
    </div>
  );
}
