"use client";

// The Quick Actions grid, copied from the reference: four cards, each one a
// link with a colored icon chip, a title and a one-line description.

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineChartBar, HiOutlineChatBubbleLeftRight, HiOutlineDocumentText, HiOutlineLightBulb } from "react-icons/hi2";
import { containerVariants, itemVariants } from "@/components/home/motion-presets";

const quickActions = [
  { to: "/notes", icon: <HiOutlineDocumentText />, title: "Generate Notes", desc: "Upload a PDF to start", color: "#3B82F6", bg: "#DBEAFE" },
  { to: "/quiz", icon: <HiOutlineLightBulb />, title: "Start a Quiz", desc: "Test your knowledge", color: "#8B5CF6", bg: "#EDE9FE" },
  { to: "/chat", icon: <HiOutlineChatBubbleLeftRight />, title: "Ask AI Tutor", desc: "Get explanations", color: "#F97316", bg: "#FFF7ED" },
  { to: "/progress", icon: <HiOutlineChartBar />, title: "View Progress", desc: "Track your scores", color: "#22C55E", bg: "#DCFCE7" },
];

export function QuickActions() {
  return (
    <>
      <motion.div variants={itemVariants} style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Quick Actions</h2>
      </motion.div>
      <motion.div
        variants={containerVariants}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}
      >
        {quickActions.map((a, i) => (
          <motion.div variants={itemVariants} key={i}>
            <Link href={a.to} style={{ textDecoration: "none" }}>
              <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem", cursor: "pointer" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: a.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", color: a.color, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>{a.title}</h3>
                  <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>{a.desc}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </>
  );
}
