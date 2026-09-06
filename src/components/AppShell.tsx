"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactNode } from "react";
import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";
import { getFirebaseAuth } from "@/lib/firebase-client";

export interface AppShellProps {
  children: ReactNode;
}

// Port of the reference App.jsx layout. The landing route renders bare, every
// other route sits in the app frame: fixed sidebar, fixed navbar and a content
// column offset by both. The sidebar slides in on small screens, so the shell
// owns its open state, the navbar toggles it and clicking any nav item closes it.
export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [configurationError, setConfigurationError] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (user) => {
        setReady(true);
        if (!user && !isAuthPage) router.replace("/login");
        if (user && isAuthPage) router.replace("/dashboard");
      });
    } catch {
      setConfigurationError(true);
      setReady(true);
    }
  }, [isAuthPage, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!ready) return null;

  if (configurationError) {
    return <main style={{ padding: "3rem", textAlign: "center" }}>Firebase Authentication is not configured.</main>;
  }

  return (
    <div className="app-layout">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <Navbar onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <main className="main-content">{children}</main>
    </div>
  );
}
