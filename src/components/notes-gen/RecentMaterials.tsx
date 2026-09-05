"use client";

import { motion } from "framer-motion";
import { HiOutlineClock } from "react-icons/hi2";
import { useApiQuery } from "@/lib/hooks/useApi";
import { formatRelative, pluralize } from "@/lib/format";
import type { MeResponse } from "@/lib/api-types";

export interface RecentMaterialsProps {
  onOpen: (materialId: string) => void;
}

// Recent Study Materials, the section under the upload form. Fed by
// /api/me, listed newest first; clicking a card opens that material's
// result view. Hidden entirely while the list is empty or still loading.
export function RecentMaterials({ onOpen }: RecentMaterialsProps) {
  const { data } = useApiQuery<MeResponse>("/api/me");

  if (!data || data.materials.length === 0) return null;

  const sorted = [...data.materials].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #E5E7EB" }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: "1.25rem", color: "#6B7280", fontWeight: 700 }}>
        <HiOutlineClock style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
        Recent Study Materials
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {sorted.map((material) => (
          <motion.div
            key={material.id}
            style={{
              padding: "1.25rem",
              cursor: "pointer",
              background: "#F9FAFB",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
            }}
            whileHover={{ scale: 1.02, background: "#F3F4F6" }}
            onClick={() => onOpen(material.id)}
          >
            <h4 style={{ color: "#3B82F6", marginBottom: "0.4rem", fontSize: "1rem", fontWeight: 700 }}>
              {material.title}
            </h4>
            <p style={{ fontSize: "0.8rem", color: "#6B7280" }}>
              {formatRelative(material.createdAt)} • {pluralize(material.topics.length, "topic")}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
