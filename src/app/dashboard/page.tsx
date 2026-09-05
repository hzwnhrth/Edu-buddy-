"use client";

// The Dashboard: the student's home screen, ported from the reference
// Dashboard.jsx. One /api/me call feeds the greeting, the streak (computed
// in the browser from the progress list), the stat cards, the review queue,
// the recent materials and the study plan.

import { motion } from "framer-motion";
import { HiOutlineBookOpen, HiOutlineFire } from "react-icons/hi2";
import { useApiQuery } from "@/lib/hooks/useApi";
import type { MeResponse } from "@/lib/api-types";
import { computeStreak, getGreeting } from "@/components/home/dashboard-helpers";
import { containerVariants, itemVariants } from "@/components/home/motion-presets";
import { StatCards } from "@/components/home/StatCards";
import { QuickActions } from "@/components/home/QuickActions";
import { ReviewToday } from "@/components/home/ReviewToday";
import { RecentActivity } from "@/components/home/RecentActivity";
import { FeedbackCard } from "@/components/home/FeedbackCard";

export default function DashboardPage() {
  const me = useApiQuery<MeResponse>("/api/me");

  // While /api/me is in flight only the loading branch below renders, and it
  // is what the server renders too. The greeting therefore only ever renders
  // in the browser after the fetch, so reading the clock here directly is
  // safe: there is no server-rendered greeting to disagree with.

  if (me.loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "5rem 0" }}>
        <div className="loading-spinner" role="status" aria-label="Loading your dashboard" />
      </div>
    );
  }

  if (me.notReady || me.error || !me.data) {
    return (
      <div className="page-container">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "1rem", color: "#9CA3AF" }}>
              <HiOutlineBookOpen />
            </div>
            <h3>{me.notReady ? "Not ready yet" : "Something went wrong"}</h3>
            <p style={{ marginBottom: "1.25rem" }}>
              {me.notReady ? "This part is not ready yet." : (me.error ?? "Your dashboard could not be loaded.")}
            </p>
            <button type="button" className="btn btn-primary" style={{ borderRadius: "9999px" }} onClick={me.reload}>
              Try again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const data = me.data;
  const greeting = getGreeting(new Date());
  const streak = computeStreak(data.progress, new Date());

  return (
    <motion.div className="page-container" initial="hidden" animate="visible" variants={containerVariants}>
      {/* Greeting */}
      <motion.div className="page-header" variants={itemVariants}>
        <h1>{greeting}</h1>
        <p>Ready to continue your study session? Pick up where you left off.</p>
      </motion.div>

      {/* Study Streak */}
      <motion.div className="streak-card" variants={itemVariants}>
        <div className="streak-flame">
          <HiOutlineFire style={{ color: "#F97316" }} />
        </div>
        <div className="streak-info">
          <h3>{streak} Day Streak</h3>
          <p>Keep it going - consistency is the key to mastery</p>
        </div>
      </motion.div>

      {/* Stats */}
      <StatCards stats={data.stats} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Review today: hidden entirely until the student has some progress */}
      {data.progress.length > 0 ? <ReviewToday progress={data.progress} now={new Date()} /> : null}

      {/* Recent Activity */}
      <motion.div variants={itemVariants} style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Recent Activity</h2>
      </motion.div>
      <RecentActivity materials={data.materials} />

      {/* Study feedback */}
      <FeedbackCard feedback={data.latestFeedback} onRefreshed={me.reload} />
    </motion.div>
  );
}
