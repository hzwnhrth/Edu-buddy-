"use client";

// The Performance Trends card, a port of the reference chart: one green-to-
// blue bar per past attempt, oldest first, with the reference tooltip.

import { motion } from "framer-motion";
import { HiOutlineChartBar } from "react-icons/hi2";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { AttemptSummary } from "@/lib/api-types";

// All optional so the element can be rendered bare inside the Tooltip
// content prop; recharts clones it and passes the real values at hover time.
type ScoreTooltipProps = Partial<TooltipContentProps<number, string>>;

function ScoreTooltip({ active, payload, label }: ScoreTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: "10px",
          padding: "0.75rem 1rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <p style={{ fontWeight: 700, marginBottom: "0.15rem", color: "#111827", fontSize: "0.9rem" }}>{label}</p>
        <p style={{ color: "#22C55E", fontSize: "0.85rem", fontWeight: 600 }}>Score: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
}

export function PerformanceTrends({ attempts }: { attempts: AttemptSummary[] }) {
  // Attempts arrive newest first; the chart reads left to right, so reverse
  // a copy and number from the oldest attempt shown.
  const chartData = attempts
    .slice()
    .reverse()
    .map((attempt, i) => ({
      name: `Quiz ${i + 1}`,
      score: Math.round(attempt.score * 100),
    }));

  return (
    <motion.div className="card" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.25rem", color: "#111827" }}>Performance Trends</h2>

      {chartData.length === 0 ? (
        <div className="empty-state" style={{ padding: "2.5rem 1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", color: "#9CA3AF" }}>
            <HiOutlineChartBar />
          </div>
          <h3>No quiz data yet</h3>
          <p>Take some quizzes to see your performance trends here!</p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ScoreTooltip />} cursor={{ fill: "rgba(34,197,94,0.05)" }} />
              <Bar dataKey="score" fill="url(#greenBarGradient)" radius={[6, 6, 6, 6]} maxBarSize={36} />
              <defs>
                <linearGradient id="greenBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
