"use client";

import { motion, type Variants } from "framer-motion";
import { HiOutlineBuildingLibrary, HiOutlineExclamationTriangle, HiOutlineChartPie, HiOutlineUsers } from "react-icons/hi2";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
};

const resourceAlerts = [
  {
    id: 1,
    priority: "High",
    subject: "Form 4 Science",
    issue: "65% of students failing recent quizzes",
    recommendation: "Allocate 2 more AI Tutor licenses or provide supplementary reading materials.",
  },
  {
    id: 2,
    priority: "Medium",
    subject: "Form 5 Mathematics",
    issue: "Students struggling with Calculus",
    recommendation: "Schedule a weekend remedial class.",
  },
  {
    id: 3,
    priority: "Low",
    subject: "Form 3 History",
    issue: "Low engagement with generated notes",
    recommendation: "Review syllabus alignment with teachers.",
  },
];

// Admin dashboard: a mock school-wide view with global stats and resource
// allocation alerts. Static demo data only.
export default function AdminDashboardPage() {
  return (
    <motion.div className="page-container" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div className="page-header" variants={itemVariants}>
        <h1>School Administrator Dashboard</h1>
        <p>Global Analytics &amp; Resource Allocation</p>
      </motion.div>

      {/* Global Stats */}
      <motion.div className="stats-grid" variants={itemVariants}>
        <div className="stat-card">
          <div className="stat-icon purple">
            <HiOutlineBuildingLibrary />
          </div>
          <div className="stat-info">
            <h3>42</h3>
            <p>Active Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <HiOutlineUsers />
          </div>
          <div className="stat-info">
            <h3>1,204</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <HiOutlineChartPie />
          </div>
          <div className="stat-info">
            <h3>82%</h3>
            <p>School Avg Score</p>
          </div>
        </div>
      </motion.div>

      {/* Resource Allocation Alerts */}
      <motion.div className="card" variants={itemVariants}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <HiOutlineExclamationTriangle style={{ fontSize: "1.5rem", color: "#EF4444" }} />
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Resource Allocation Alerts</h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {resourceAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: "1.5rem",
                borderLeft: `4px solid ${alert.priority === "High" ? "#EF4444" : alert.priority === "Medium" ? "#F59E0B" : "#3B82F6"}`,
                background: "#FAFBFC",
                borderRadius: "8px",
                borderTop: "1px solid #E5E7EB",
                borderRight: "1px solid #E5E7EB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>{alert.subject}</h3>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: alert.priority === "High" ? "#FEE2E2" : alert.priority === "Medium" ? "#FEF3C7" : "#DBEAFE",
                    color: alert.priority === "High" ? "#B91C1C" : alert.priority === "Medium" ? "#B45309" : "#1D4ED8",
                  }}
                >
                  {alert.priority} Priority
                </span>
              </div>
              <p style={{ color: "#EF4444", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem" }}>Issue: {alert.issue}</p>
              <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>
                <strong>Recommendation:</strong> {alert.recommendation}
              </p>

              <div style={{ marginTop: "1rem" }}>
                <button className="btn btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                  Allocate Resources
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
