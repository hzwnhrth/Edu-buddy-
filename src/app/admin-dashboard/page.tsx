"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { HiOutlineArrowPath, HiOutlineBell, HiOutlineBuildingLibrary, HiOutlineCalendarDays, HiOutlineChartPie, HiOutlineCheckCircle, HiOutlineClipboardDocumentList, HiOutlineExclamationTriangle, HiOutlineShoppingCart, HiOutlineUsers } from "react-icons/hi2";
import { apiFetch } from "@/lib/profile-client";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };

type Alert = { id: string; priority: "High" | "Medium" | "Low"; subject: string; teacher: string; issue: string; recommendation: string; remedial: { day: string; time: string; room: string }; licenses: number };
type Overview = { stats: { activeClasses: number; totalStudents: number; quizzesTaken: number; schoolAvgScore: number | null }; alerts: Alert[] };

const sampleAlerts: Alert[] = [
  { id: "science", priority: "High", subject: "Form 4 Science", teacher: "Class Teacher", issue: "65% of students failing recent quizzes", recommendation: "Allocate additional AI Tutor licenses or provide supplementary reading materials.", remedial: { day: "Saturday", time: "10:00 AM", room: "Science Lab" }, licenses: 2 },
  { id: "math", priority: "Medium", subject: "Form 5 Mathematics", teacher: "Class Teacher", issue: "Students struggling with Calculus", recommendation: "Schedule a weekend remedial class.", remedial: { day: "Sunday", time: "9:00 AM", room: "To be scheduled" }, licenses: 1 },
];

const actionTypes = [
  { key: "notified", label: "Notify Teacher", icon: HiOutlineBell },
  { key: "scheduled", label: "Schedule Class", icon: HiOutlineCalendarDays },
  { key: "licenses", label: "Buy Licenses", icon: HiOutlineShoppingCart },
] as const;

function actionMessage(alert: Alert, action: typeof actionTypes[number]["key"]) {
  if (action === "notified") return `${alert.teacher} has been notified about ${alert.subject}.`;
  if (action === "scheduled") return `Remedial class booked for ${alert.subject}: ${alert.remedial.day}, ${alert.remedial.time}, ${alert.remedial.room}.`;
  return `${alert.licenses} AI Tutor license${alert.licenses === 1 ? "" : "s"} requested for ${alert.subject}.`;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [actioned, setActioned] = useState<Record<string, typeof actionTypes[number]["key"]>>({});
  const [filter, setFilter] = useState<"all" | "open" | "actioned">("all");
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => { void apiFetch<Overview>("/api/admin/overview").then(setOverview).catch(() => setOverview(null)); }, []);

  const alerts = overview?.alerts.length ? overview.alerts : sampleAlerts;
  const stats = overview?.stats;
  const visibleAlerts = alerts.filter((alert) => filter === "all" || (filter === "actioned" ? Boolean(actioned[alert.id]) : !actioned[alert.id]));
  const openCount = alerts.length - Object.keys(actioned).length;
  const takeAction = (alert: Alert, action: typeof actionTypes[number]["key"]) => {
    setActioned((current) => ({ ...current, [alert.id]: action }));
    setLog((current) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ${actionMessage(alert, action)}`, ...current]);
  };
  const undo = (alert: Alert) => {
    const action = actioned[alert.id];
    setActioned((current) => { const next = { ...current }; delete next[alert.id]; return next; });
    setLog((current) => [`${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} Reopened ${alert.subject} after undoing ${action}.`, ...current]);
  };

  return <motion.div className="page-container" initial="hidden" animate="visible" variants={containerVariants}>
    <motion.div className="page-header" variants={itemVariants}><h1>School Administrator Dashboard</h1><p>Global Analytics &amp; Resource Allocation</p></motion.div>
    <motion.div className="stats-grid" variants={itemVariants}>
      <Stat icon={<HiOutlineBuildingLibrary />} color="purple" value={stats?.activeClasses ?? 0} label="Active Classes" />
      <Stat icon={<HiOutlineUsers />} color="blue" value={(stats?.totalStudents ?? 0).toLocaleString()} label="Total Students" />
      <Stat icon={<HiOutlineChartPie />} color="green" value={stats?.schoolAvgScore === null || !stats ? "-" : `${stats.schoolAvgScore}%`} label={stats ? `School Avg · ${stats.quizzesTaken} quizzes` : "School Avg Score"} />
    </motion.div>
    <motion.section className="card" variants={itemVariants}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}><HiOutlineExclamationTriangle style={{ fontSize: "1.5rem", color: "#EF4444" }} /><h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Resource Allocation Alerts</h2><span style={{ fontSize: "0.65rem", fontWeight: 800, color: overview ? "#16A34A" : "#9CA3AF" }}>{overview ? "LIVE DATA" : "SAMPLE DATA"}</span></div>
        <div style={{ display: "flex", gap: "0.5rem" }}>{(["all", "open", "actioned"] as const).map((value) => <button key={value} onClick={() => setFilter(value)} style={{ padding: "0.35rem 0.85rem", borderRadius: "9999px", border: `2px solid ${filter === value ? "#16A34A" : "#E5E7EB"}`, background: filter === value ? "#DCFCE7" : "white", color: filter === value ? "#16A34A" : "#6B7280", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", textTransform: "capitalize" }}>{value} ({value === "all" ? alerts.length : value === "open" ? openCount : alerts.length - openCount})</button>)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{visibleAlerts.map((alert) => {
        const action = actioned[alert.id];
        return <div key={alert.id} style={{ padding: "1.5rem", borderLeft: `4px solid ${action ? "#22C55E" : alert.priority === "High" ? "#EF4444" : alert.priority === "Medium" ? "#F59E0B" : "#3B82F6"}`, background: action ? "#F0FDF4" : "#FAFBFC", borderRadius: "8px", borderTop: "1px solid #E5E7EB", borderRight: "1px solid #E5E7EB", borderBottom: "1px solid #E5E7EB" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}><h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{alert.subject}</h3><span style={{ fontSize: "0.75rem", fontWeight: 800, color: action ? "#16A34A" : "#B45309" }}>{action ? `Actioned: ${actionTypes.find((item) => item.key === action)?.label}` : `${alert.priority} Priority`}</span></div>
          <p style={{ color: action ? "#16A34A" : "#DC2626", fontWeight: 600, fontSize: "0.9rem", margin: "0.6rem 0" }}>Issue: {alert.issue}</p><p style={{ color: "#6B7280", fontSize: "0.9rem" }}><strong>Recommendation:</strong> {alert.recommendation}</p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1rem" }}>{action ? <button onClick={() => undo(alert)} className="btn btn-secondary" style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}><HiOutlineArrowPath /> Undo</button> : actionTypes.map((item) => <button key={item.key} onClick={() => takeAction(alert, item.key)} className="btn btn-secondary" style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}><item.icon /> {item.label}</button>)}</div>
        </div>;
      })}{visibleAlerts.length === 0 ? <p style={{ textAlign: "center", color: "#9CA3AF", padding: "1rem" }}>No {filter} alerts.</p> : null}</div>
    </motion.section>
    <motion.section className="card" variants={itemVariants} style={{ marginTop: "2rem" }}><div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}><HiOutlineClipboardDocumentList style={{ fontSize: "1.4rem", color: "#3B82F6" }} /><h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Session Activity</h2></div>{log.length ? log.map((entry) => <p key={entry} style={{ padding: "0.7rem", background: "#F9FAFB", borderRadius: "8px", marginBottom: "0.5rem", fontSize: "0.85rem" }}><HiOutlineCheckCircle style={{ color: "#16A34A", verticalAlign: "middle" }} /> {entry}</p>) : <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>No actions taken in this session.</p>}</motion.section>
  </motion.div>;
}

function Stat({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string | number; label: string }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-info"><h3>{value}</h3><p>{label}</p></div></div>;
}
