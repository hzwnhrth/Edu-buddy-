"use client";

import { useEffect, useState } from "react";
import { HiOutlineBookOpen, HiOutlineDocumentText, HiOutlineLightBulb } from "react-icons/hi2";
import { NotesGenerator } from "@/components/notes-gen/NotesGenerator";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/profile-client";

type Material = { id: string; title: string; sourceName: string; topics: { id: string; name: string }[]; notes?: { summary: string; sections: { heading: string; content: string }[]; keyPoints: string[]; flashcards: { front: string; back: string }[] } | null };

export function NotesWorkspace() {
  const [student, setStudent] = useState<boolean | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selected, setSelected] = useState<Material | null>(null);
  const [tab, setTab] = useState<"notes" | "cards" | "points">("notes");
  useEffect(() => {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    void user.getIdTokenResult().then((token) => {
      const isStudent = token.claims.role !== "teacher" && token.claims.role !== "admin";
      setStudent(isStudent);
      if (isStudent) void apiFetch<{ materials: Material[] }>("/api/materials").then((data) => setMaterials(data.materials));
    });
  }, []);
  if (student !== true) return <NotesGenerator />;
  if (selected) return <section className="page-container"><button onClick={() => setSelected(null)} className="btn btn-secondary" style={{ marginBottom: "1.25rem" }}>Back to library</button><div className="page-header"><h1>{selected.title}</h1><p>{selected.sourceName}</p></div><div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>{(["notes", "cards", "points"] as const).map((value) => <button key={value} onClick={() => setTab(value)} className={tab === value ? "btn btn-primary" : "btn btn-secondary"} style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem", textTransform: "capitalize" }}>{value === "cards" ? "Flashcards" : value === "points" ? "Key points" : "Notes"}</button>)}</div><div className="card">{tab === "notes" ? <>{selected.notes?.summary ? <p style={{ color: "#4B5563", lineHeight: 1.7, marginBottom: "1.5rem" }}>{selected.notes.summary}</p> : null}{selected.notes?.sections.map((section) => <article key={section.heading} style={{ marginBottom: "1.25rem" }}><h2 style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>{section.heading}</h2><p style={{ color: "#4B5563", lineHeight: 1.7 }}>{section.content}</p></article>)}</> : tab === "cards" ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>{selected.notes?.flashcards.map((card) => <div key={card.front} style={{ padding: "1rem", border: "1px solid #E5E7EB", borderRadius: "12px" }}><strong>{card.front}</strong><p style={{ color: "#6B7280", marginTop: "0.5rem" }}>{card.back}</p></div>)}</div> : <ul style={{ paddingLeft: "1.25rem", color: "#4B5563", lineHeight: 1.9 }}>{selected.notes?.keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>}</div></section>;
  return <section className="page-container"><div className="page-header"><h1>Study Materials</h1><p>Teacher-approved lessons ready for your revision.</p></div>{materials.length === 0 ? <div className="card" style={{ textAlign: "center", padding: "3rem", color: "#9CA3AF" }}><HiOutlineBookOpen style={{ fontSize: "2rem", marginBottom: "0.5rem" }} /><p>No published lessons yet.</p></div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>{materials.map((material) => <button key={material.id} onClick={() => setSelected(material)} style={{ textAlign: "left", padding: "1.35rem", background: "white", border: "1px solid #E5E7EB", borderRadius: "16px", cursor: "pointer", font: "inherit" }}><HiOutlineDocumentText style={{ color: "#3B82F6", fontSize: "1.5rem" }} /><h2 style={{ fontSize: "1.05rem", margin: "0.7rem 0 0.35rem" }}>{material.title}</h2><p style={{ color: "#6B7280", fontSize: "0.85rem" }}><HiOutlineLightBulb style={{ verticalAlign: "middle" }} /> {material.topics.length} topics</p></button>)}</div>}</section>;
}
