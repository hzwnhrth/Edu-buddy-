"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { HiOutlineAcademicCap, HiOutlineExclamationCircle, HiOutlineEye, HiOutlineUser, HiOutlineUserGroup } from "react-icons/hi2";
import { apiFetch } from "@/lib/profile-client";

const containerVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants: Variants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } } };

type Student = { id: string; name: string; mastery: number | null; status: "red" | "yellow" | "green"; quizzesTaken: number; weakTopics: string[]; lastActiveAt: string | null };
type Classroom = { stats: { totalStudents: number; needAttention: number; classAvgScore: number | null }; students: Student[]; weaknessRows: { studentId: string; name: string; topic: string; score: string; lastActive: string }[] };
type Material = { id: string; title: string; status: "processing" | "ready" | "error"; notes?: unknown; visibility?: "draft" | "published" };
type Me = { materials: Material[] };
const status = { red: { color: "#EF4444", label: "Immediate Attention" }, yellow: { color: "#F59E0B", label: "Needs Practice" }, green: { color: "#22C55E", label: "Mastering" }, none: { color: "#9CA3AF", label: "No attempts yet" } };

export default function TeacherDashboardPage() {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void apiFetch<Classroom>("/api/teacher/classroom").then(setClassroom).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load classroom data."));
    void apiFetch<Me>("/api/me").then((data) => setMaterials(data.materials)).catch(() => {});
  }, []);
  const stats = classroom?.stats;
  const students = classroom?.students ?? [];

  return <motion.div className="page-container" initial="hidden" animate="visible" variants={containerVariants}>
    <motion.div className="page-header" variants={itemVariants}><h1>Teacher Dashboard</h1><p>Class Overview &amp; Analytics {classroom ? <span style={{ marginLeft: "0.5rem", fontSize: "0.65rem", color: "#16A34A", fontWeight: 800 }}>LIVE DATA</span> : null}</p></motion.div>
    <motion.div className="stats-grid" variants={itemVariants}>
      <Stat icon={<HiOutlineUserGroup />} color="blue" value={stats?.totalStudents ?? "-"} label="Total Students" />
      <Stat icon={<HiOutlineExclamationCircle />} color="red" value={stats?.needAttention ?? "-"} label="Need Attention" />
      <Stat icon={<HiOutlineAcademicCap />} color="green" value={stats?.classAvgScore === null || !stats ? "-" : `${stats.classAvgScore}%`} label="Class Avg Score" />
    </motion.div>
    <motion.section className="card" variants={itemVariants} style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "0.75rem", flexWrap: "wrap" }}><h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Classroom View</h2><div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1rem", fontSize: "0.8rem", fontWeight: 600 }}>{(["red", "yellow", "green"] as const).map((key) => <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><i style={{ width: 10, height: 10, borderRadius: 3, background: status[key].color }} />{status[key].label}</span>)}</div></div>
      {error ? <p style={{ color: "#DC2626" }}>{error}</p> : students.length === 0 ? <p style={{ color: "#9CA3AF", textAlign: "center", padding: "1.5rem" }}>No student activity yet. Classroom mastery will appear after students complete quizzes.</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))", gap: "1rem" }}>{students.map((student) => {
        const meta = student.mastery === null ? status.none : status[student.status];
        return <motion.div key={student.id} whileHover={{ y: -4 }} title={`${student.name}: ${meta.label}`} style={{ border: "1px solid #E5E7EB", borderRadius: "16px", padding: "1.2rem 0.75rem", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 0.6rem", background: `conic-gradient(${meta.color} ${(student.mastery ?? 0) * 3.6}deg, #E5E7EB 0deg)`, display: "grid", placeItems: "center" }}><div style={{ width: 58, height: 58, borderRadius: "50%", background: "white", display: "grid", placeItems: "center", fontWeight: 800 }}>{student.mastery === null ? "-" : `${student.mastery}%`}</div></div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.3rem", fontWeight: 700 }}><HiOutlineUser style={{ color: meta.color }} />{student.name}</div><span style={{ display: "inline-block", marginTop: "0.45rem", padding: "0.2rem 0.55rem", borderRadius: "9999px", background: `${meta.color}1A`, color: meta.color, fontSize: "0.65rem", fontWeight: 800 }}>{meta.label}</span>
        </motion.div>;
      })}</div>}
    </motion.section>
    <motion.section className="card" variants={itemVariants} style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "0.35rem" }}>Lesson Library</h2><p style={{ color: "#6B7280", fontSize: "0.9rem", marginBottom: "1.25rem" }}>Publish ready lesson notes to make them available in the student study library.</p>
      {materials.length === 0 ? <p style={{ color: "#9CA3AF" }}>Create a lesson from the Notes Generator to publish it here.</p> : <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>{materials.map((material) => {
        const publishable = material.status === "ready" && material.notes;
        const published = material.visibility === "published";
        return <div key={material.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.9rem 1rem", border: "1px solid #E5E7EB", borderRadius: "12px", flexWrap: "wrap" }}><div><strong>{material.title}</strong><p style={{ color: published ? "#16A34A" : "#9CA3AF", fontSize: "0.78rem", marginTop: "0.2rem" }}>{published ? "Published to students" : publishable ? "Ready to publish" : "Generate notes before publishing"}</p></div><button disabled={!publishable} onClick={async () => { const updated = await apiFetch<Material>(`/api/materials/${material.id}`, { method: "PATCH", body: { visibility: published ? "draft" : "published" } }); setMaterials((items) => items.map((item) => item.id === updated.id ? updated : item)); }} className={published ? "btn btn-secondary" : "btn btn-primary"} style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}>{published ? "Unpublish" : "Publish"}</button></div>;
      })}</div>}
    </motion.section>
    <motion.section className="card" variants={itemVariants}><h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "1.5rem" }}>Action Required: Student Weaknesses</h2><div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 620 }}><thead><tr style={{ borderBottom: "2px solid #E5E7EB", color: "#6B7280", fontSize: "0.78rem", textTransform: "uppercase" }}><th style={{ padding: "1rem" }}>Student</th><th style={{ padding: "1rem" }}>Weak Topic</th><th style={{ padding: "1rem" }}>Avg Score</th><th style={{ padding: "1rem" }}>Last Active</th><th style={{ padding: "1rem" }}>Action</th></tr></thead><tbody>{classroom?.weaknessRows.map((row) => <tr key={`${row.studentId}-${row.topic}`} style={{ borderBottom: "1px solid #E5E7EB" }}><td style={{ padding: "1rem", fontWeight: 600 }}>{row.name}</td><td style={{ padding: "1rem", color: "#DC2626", fontWeight: 600 }}>{row.topic}</td><td style={{ padding: "1rem" }}>{row.score}</td><td style={{ padding: "1rem", color: "#9CA3AF" }}>{row.lastActive}</td><td style={{ padding: "1rem" }}><button className="btn btn-secondary" title={`${row.name} has a weak result in ${row.topic}`} style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}><HiOutlineEye /> View</button></td></tr>)}</tbody></table>{classroom && classroom.weaknessRows.length === 0 ? <p style={{ color: "#9CA3AF", textAlign: "center", padding: "1.25rem" }}>No weak topics detected.</p> : null}</div></motion.section>
  </motion.div>;
}

function Stat({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string | number; label: string }) { return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div className="stat-info"><h3>{value}</h3><p>{label}</p></div></div>; }
