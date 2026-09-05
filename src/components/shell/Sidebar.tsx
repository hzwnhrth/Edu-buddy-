"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineLightBulb,
} from "react-icons/hi2";

interface NavItem {
  to: string;
  icon: IconType;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", icon: HiOutlineHome, label: "Dashboard" },
  { to: "/notes", icon: HiOutlineDocumentText, label: "Notes Generator" },
  { to: "/quiz", icon: HiOutlineLightBulb, label: "Quiz Arena" },
  { to: "/chat", icon: HiOutlineChatBubbleLeftRight, label: "AI Tutor" },
  { to: "/progress", icon: HiOutlineChartBar, label: "Progress" },
];

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
export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

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

      <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #E5E7EB", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ fontSize: "0.65rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 800, marginBottom: "0.25rem" }}>
          Demo Views
        </div>
        <Link href="/dashboard" className={itemClass("/dashboard")} style={{ padding: "0.5rem", fontSize: "0.8rem" }} onClick={onNavigate}>
          Student View
        </Link>
        <Link href="/teacher-dashboard" className={itemClass("/teacher-dashboard")} style={{ padding: "0.5rem", fontSize: "0.8rem" }} onClick={onNavigate}>
          Teacher View
        </Link>
        <Link href="/admin-dashboard" className={itemClass("/admin-dashboard")} style={{ padding: "0.5rem", fontSize: "0.8rem" }} onClick={onNavigate}>
          Admin View
        </Link>
      </div>
    </aside>
  );
}
