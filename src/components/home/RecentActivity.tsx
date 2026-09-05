"use client";

// The Recent Activity card: the profile's study materials, newest first,
// each row an icon chip, the title, a topic-count line and the relative time
// at the right, linking into the Notes Generator with that material
// selected. With no materials at all it shows the reference empty state with
// the two ways in: upload, or try the bundled sample.

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineBookOpen, HiOutlineDocumentText } from "react-icons/hi2";
import type { Material } from "@/lib/types";
import { formatRelative, pluralize } from "@/lib/format";
import { itemVariants } from "@/components/home/motion-presets";
import { TrySampleButton } from "@/components/home/TrySampleButton";

export function RecentActivity({ materials }: { materials: Material[] }) {
  const newestFirst = [...materials].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <motion.div className="card" variants={itemVariants} style={{ marginBottom: "2.5rem" }}>
      {newestFirst.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: "3rem", marginBottom: "1rem", color: "#9CA3AF" }}>
            <HiOutlineBookOpen />
          </div>
          <h3>No notes yet</h3>
          <p style={{ marginBottom: "1.25rem" }}>Upload your first PDF to get started with intelligent studying.</p>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/notes" className="btn btn-primary" style={{ borderRadius: "9999px" }}>
              <HiOutlineDocumentText /> Upload notes
            </Link>
            <TrySampleButton />
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {newestFirst.map((material) => (
            <Link key={material.id} href={`/notes?material=${material.id}`} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.85rem",
                padding: "0.85rem 1rem", borderRadius: "12px",
                background: "#F9FAFB", border: "1px solid #F3F4F6", cursor: "pointer",
              }}>
                <span style={{ fontSize: "1.35rem", background: "#FFFFFF", padding: "0.6rem", borderRadius: "10px", border: "1px solid #E5E7EB", color: "#3B82F6" }}>
                  <HiOutlineDocumentText />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {material.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#6B7280" }}>
                    {pluralize(material.topics.length, "topic")} extracted
                  </div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#9CA3AF", fontWeight: 500, flexShrink: 0 }}>
                  {formatRelative(material.createdAt)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </motion.div>
  );
}
