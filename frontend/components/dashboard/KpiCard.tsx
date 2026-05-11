"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
  index?: number
  delta?: string
  deltaPositive?: boolean
}

export default function KpiCard({ label, value, sub, accent = false, index = 0, delta, deltaPositive }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.4, delay: index * 0.06, ease }}
      style={{ background: "#0d0d0d" }}
    >
      {/* Label row */}
      <div
        className="px-4 py-2"
        style={{ borderBottom: "1px solid #141414" }}
      >
        <p className="term-label" style={{ margin: 0 }}>[ {label.toUpperCase()} ]</p>
      </div>

      {/* Value */}
      <div className="px-4 py-4">
        <p
          className="font-mono leading-none tabular-nums"
          style={{
            fontSize: "clamp(1.6rem, 3vw, 2rem)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: accent ? "#14f195" : "#eaeaea",
            margin: 0,
          }}
        >
          {value}
        </p>

        {delta && (
          <p
            className="font-mono mt-2"
            style={{ fontSize: "9px", letterSpacing: "0.08em", color: deltaPositive ? "#14f195" : "#e61919", margin: "8px 0 0" }}
          >
            {deltaPositive ? "▲" : "▼"} {delta}
          </p>
        )}

        {sub && (
          <p
            className="font-mono"
            style={{ fontSize: "9px", letterSpacing: "0.06em", color: "#555", margin: "4px 0 0" }}
          >
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  )
}
