"use client";

// The four stat cards under the streak card, in the reference layout: icon
// chip on the left, big number over a small label on the right. The numbers
// come from /api/me; the questions-asked card of the reference has no
// counterpart in the API, so its slot shows the weak-topic count instead.

import { motion } from "framer-motion";
import { HiOutlineBookOpen, HiOutlineLightBulb, HiOutlineQuestionMarkCircle, HiOutlineTrophy } from "react-icons/hi2";
import type { MeStats } from "@/lib/api-types";
import { formatPercent } from "@/lib/format";
import { containerVariants, itemVariants } from "@/components/home/motion-presets";

export interface StatCardsProps {
  stats: MeStats;
}

export function StatCards({ stats }: StatCardsProps) {
  const statCards = [
    { icon: <HiOutlineBookOpen />, label: "Notes Generated", value: stats.materials, color: "blue" },
    { icon: <HiOutlineLightBulb />, label: "Quizzes Taken", value: stats.quizzesTaken, color: "purple" },
    { icon: <HiOutlineQuestionMarkCircle />, label: "Weak Topics", value: stats.weakTopics, color: "orange" },
    {
      icon: <HiOutlineTrophy />,
      label: "Avg. Score",
      value: stats.averageScore === null ? "-" : formatPercent(stats.averageScore),
      color: "green",
    },
  ];

  return (
    <motion.div className="stats-grid" variants={containerVariants}>
      {statCards.map((s, i) => (
        <motion.div className="stat-card" key={i} variants={itemVariants}>
          <div className={`stat-icon ${s.color}`}>{s.icon}</div>
          <div className="stat-info">
            <h3>{s.value}</h3>
            <p>{s.label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
