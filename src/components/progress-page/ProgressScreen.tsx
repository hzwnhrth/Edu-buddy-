"use client";

// The Progress screen, a port of the reference Progress.jsx: the four stat
// cards, the Performance Trends chart and the Recent Quizzes list side by
// side, then our Focus Areas section and the study plan card. One /api/me
// call feeds all of it.

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  HiOutlineBookOpen,
  HiOutlineChartBar,
  HiOutlineQuestionMarkCircle,
  HiOutlineTrophy,
} from "react-icons/hi2";
import type { AttemptSummary, MeResponse } from "@/lib/api-types";
import { useApiQuery } from "@/lib/hooks/useApi";
import { formatPercent } from "@/lib/format";
import { buildTitleLookups } from "./material-titles";
import { PerformanceTrends } from "./PerformanceTrends";
import { RecentQuizzes } from "./RecentQuizzes";
import { FocusAreas } from "./FocusAreas";
import { StudyFeedback } from "./StudyFeedback";

export function ProgressScreen() {
  const me = useApiQuery<MeResponse>("/api/me");
  const searchParams = useSearchParams();
  const topicParam = searchParams.get("topic");

  const weakTopics = useMemo(
    () => (me.data ? me.data.progress.filter((entry) => entry.weak) : []),
    [me.data]
  );
  const lookups = useMemo(() => buildTitleLookups(me.data?.materials ?? []), [me.data]);

  function titleFor(attempt: AttemptSummary): string | null {
    for (const topicId of attempt.topicIds) {
      const title = lookups.byTopicId.get(topicId);
      if (title) return title;
    }
    return null;
  }

  if (me.loading) {
    return (
      <div className="page-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "5rem 0" }}>
        <div className="loading-spinner" role="status" aria-label="Loading your progress" />
      </div>
    );
  }

  if (me.notReady || me.error || !me.data) {
    return (
      <div className="page-container">
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="empty-state">
            <div style={{ fontSize: "3rem", marginBottom: "1rem", color: "#9CA3AF" }}>
              <HiOutlineChartBar />
            </div>
            <h3>{me.notReady ? "Not ready yet" : "Something went wrong"}</h3>
            <p style={{ marginBottom: "1.25rem" }}>
              {me.notReady ? "This part is not ready yet." : (me.error ?? "Your progress could not be loaded.")}
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

  // The reference's fourth card slot shows the weak-topic count where their
  // design asked how many questions the student had asked; the API has no
  // such counter.
  const statCards = [
    { icon: <HiOutlineBookOpen />, label: "Notes Generated", value: data.stats.materials, color: "blue" },
    { icon: <HiOutlineChartBar />, label: "Quizzes Taken", value: data.stats.quizzesTaken, color: "purple" },
    { icon: <HiOutlineQuestionMarkCircle />, label: "Weak Topics", value: data.stats.weakTopics, color: "orange" },
    {
      icon: <HiOutlineTrophy />,
      label: "Average Score",
      value: data.stats.averageScore === null ? "-" : formatPercent(data.stats.averageScore),
      color: "green",
    },
  ];

  return (
    <motion.div className="page-container" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="page-header">
        <h1>Your Progress</h1>
        <p>Track your learning journey and see how you&apos;re improving over time.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "2rem" }}>
        {statCards.map((s, i) => (
          <motion.div
            className="stat-card"
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className={`stat-icon ${s.color}`}>{s.icon}</div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
        {/* Quiz Performance Chart */}
        <PerformanceTrends attempts={data.attempts} />

        {/* Recent Quizzes List */}
        <RecentQuizzes attempts={data.attempts} titleFor={titleFor} />
      </div>

      {/* Focus Areas (ours): weak topics with expandable explanations */}
      <FocusAreas
        weakTopics={weakTopics}
        titlesByMaterialId={lookups.byMaterialId}
        initiallyExpandedTopicId={topicParam}
      />

      {/* Study feedback */}
      <div style={{ marginTop: "1.5rem" }}>
        <StudyFeedback feedback={data.latestFeedback} onRefreshed={me.reload} />
      </div>
    </motion.div>
  );
}
