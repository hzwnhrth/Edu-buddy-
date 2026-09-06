"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import type { ReactNode } from "react";
import { Navbar } from "@/components/shell/Navbar";
import { Sidebar } from "@/components/shell/Sidebar";
import { getFirebaseAuth } from "@/lib/firebase-client";

type Role = "student" | "teacher" | "admin";

const homeForRole: Record<Role, string> = {
  student: "/dashboard",
  teacher: "/teacher-dashboard",
  admin: "/admin-dashboard",
};

function roleForClaims(role: unknown): Role {
  return role === "teacher" || role === "admin" ? role : "student";
}

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
  const [role, setRole] = useState<Role>("student");
  const [configurationError, setConfigurationError] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicPage = pathname === "/" || isAuthPage;

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), async (user) => {
        setReady(true);
        if (!user && !isPublicPage) router.replace("/login");
        if (!user) return;

        const userRole = roleForClaims((await user.getIdTokenResult()).claims.role);
        setRole(userRole);
        const home = homeForRole[userRole];
        if (isAuthPage) router.replace(home);
        if (pathname === "/teacher-dashboard" && userRole !== "teacher") router.replace(home);
        if (pathname === "/admin-dashboard" && userRole !== "admin") router.replace(home);
        if (["/dashboard", "/quiz", "/chat", "/progress"].includes(pathname) && userRole !== "student") router.replace(home);
        if (pathname === "/notes" && userRole === "admin") router.replace(home);
      });
    } catch {
      setConfigurationError(true);
      setReady(true);
    }
  }, [isAuthPage, isPublicPage, pathname, router]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!ready) return null;

  if (configurationError) {
    return <main style={{ padding: "3rem", textAlign: "center" }}>Firebase Authentication is not configured.</main>;
  }

  return (
    <div className="app-layout">
      <Sidebar role={role} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <Navbar role={role} onMenuToggle={() => setSidebarOpen((open) => !open)} />
      <main className="main-content">{children}</main>
    </div>
  );
}
