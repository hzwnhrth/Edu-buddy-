"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  HiOutlineBuildingLibrary,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineLightBulb,
  HiOutlineUserGroup,
} from "react-icons/hi2";

interface NavItem {
  to: string;
  icon: IconType;
  label: string;
}

const studentNavItems: NavItem[] = [
  { to: "/dashboard", icon: HiOutlineHome, label: "Dashboard" },
  { to: "/notes", icon: HiOutlineDocumentText, label: "Notes Generator" },
  { to: "/quiz", icon: HiOutlineLightBulb, label: "Quiz Arena" },
  { to: "/chat", icon: HiOutlineChatBubbleLeftRight, label: "AI Tutor" },
  { to: "/progress", icon: HiOutlineChartBar, label: "Progress" },
];

const workspaceNavItems: Record<"teacher" | "admin", NavItem[]> = {
  teacher: [
    { to: "/teacher-dashboard", icon: HiOutlineUserGroup, label: "Classroom" },
    { to: "/notes", icon: HiOutlineDocumentText, label: "Lesson Studio" },
  ],
  admin: [{ to: "/admin-dashboard", icon: HiOutlineBuildingLibrary, label: "School Overview" }],
};

// Matches react-router NavLink semantics: a link stays active on child routes,
// so /notes/abc still highlights Notes Generator.
function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Sidebar Component
 * Renders the side navigation menu. Contains links to all the main features
 * (Dashboard, Notes Generator, etc.) and the Demo Views switcher at the bottom.
 */
export function Sidebar({ role, open, onNavigate }: { role: "student" | "teacher" | "admin"; open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const navItems = role === "student" ? studentNavItems : workspaceNavItems[role];

  const itemClass = (href: string) =>
    `nav-item ${isRouteActive(pathname, href) ? "active" : ""}`;

  return (
    <aside className={`sidebar${open ? " open" : ""}`}>
      <Link
        href="/"
        className="sidebar-brand"
        style={{ textDecoration: "none", display: "flex", justifyContent: "center" }}
        onClick={onNavigate}
      >
        {/* Local SVG asset ported unchanged from the reference design. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/edubuddy_full_logo.svg"
          alt="EduBuddy Logo"
          style={{ width: "100%", maxWidth: "160px", height: "auto", objectFit: "contain" }}
        />
      </Link>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link key={item.to} href={item.to} className={itemClass(item.to)} onClick={onNavigate}>
            <item.icon className="nav-item-icon" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: "auto", padding: "1rem 1.25rem", borderTop: "1px solid #E5E7EB", fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {role} workspace
      </div>
    </aside>
  );
}
