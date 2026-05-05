"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
  index?: number
}

export default function KpiCard({ label, value, sub, accent = false, index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, delay: index * 0.1, ease }}
      whileHover={{
        borderColor: "rgba(20,241,149,0.25)",
        boxShadow: "0 0 20px rgba(20,241,149,0.06)",
      }}
      className="rounded-2xl p-6"
      style={{ background: "#111111", border: "1px solid #222222" }}
    >
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#555555" }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold leading-none tabular-nums"
        style={{
          color: accent ? "#14f195" : "#f5f5f5",
          textShadow: accent ? "0 0 20px rgba(20,241,149,0.25)" : undefined,
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-2 font-mono" style={{ color: "#555555" }}>
          {sub}
        </p>
      )}
    </motion.div>
  )
}
