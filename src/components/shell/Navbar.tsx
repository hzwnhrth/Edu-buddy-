"use client";

import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { HiOutlineArrowRightOnRectangle, HiOutlineBars3, HiOutlineSparkles } from "react-icons/hi2";
import { RuntimeBadge } from "@/components/RuntimeBadge";
import { getFirebaseAuth } from "@/lib/firebase-client";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/notes": "Notes Generator",
  "/quiz": "Quiz Arena",
  "/chat": "AI Tutor",
  "/progress": "Progress",
  "/teacher-dashboard": "Teacher Dashboard",
  "/admin-dashboard": "School Administrator Dashboard",
};

interface NavbarProps {
  onMenuToggle: () => void;
  role: "student" | "teacher" | "admin";
}

/**
 * Navbar Component
 * Renders the top navigation bar. It displays the current page title dynamically
 * based on the route, and includes the SDG 4 badge and a user profile icon.
 * The menu button only appears on small screens, where it opens the sidebar.
 */
export function Navbar({ onMenuToggle, role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] ?? "EduBuddy AI";

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          type="button"
          className="navbar-menu-btn"
          aria-label="Toggle navigation"
          onClick={onMenuToggle}
        >
          <HiOutlineBars3 />
        </button>
        <h1 className="navbar-title">{title}</h1>
      </div>
      <div className="navbar-actions">
        <span className="sdg-badge">
          <HiOutlineSparkles style={{ color: "#22C55E" }} /> SDG 4: Quality Education
        </span>
        <RuntimeBadge />
        <button
          type="button"
          onClick={async () => {
            await signOut(getFirebaseAuth());
            router.replace("/login");
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.45rem 0.75rem", border: "1px solid #FECACA", borderRadius: "9999px", background: "#FFF7F7", color: "#DC2626", cursor: "pointer", font: "inherit", fontSize: "0.78rem", fontWeight: 700 }}
        >
          <HiOutlineArrowRightOnRectangle /> Sign out
        </button>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "var(--radius-full)",
            background: "linear-gradient(135deg, #22C55E, #16A34A)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
            fontWeight: "700",
            color: "#FFFFFF",
            boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
          }}
        >
          {role.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
