"use client"

import { motion } from "motion/react"
import { viewportOnce } from "@/lib/motion"
import type { RiskUtilization } from "@/lib/api"

function Bar({ label, pct }: { label: string; pct: number }) {
  const color = pct > 80 ? "#e61919" : pct > 60 ? "#f59e0b" : "#14f195"
  const filled = Math.round(pct / 10)
  const blocks = Array.from({ length: 10 }, (_, i) => i < filled)

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
          {label}
        </span>
        <span className="font-mono" style={{ fontSize: "10px", color, letterSpacing: "0.06em", fontWeight: 700 }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      {/* Segmented terminal bar */}
      <div className="flex gap-px">
        {blocks.map((on, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.15, delay: i * 0.04 }}
            style={{
              flex: 1,
              height: "6px",
              background: on ? color : "#161616",
            }}
          />
        ))}
      </div>
    </div>
  )
}

const GUARD_COLOR = { ok: "#14f195", warning: "#f59e0b", tripped: "#e61919" } as const

export default function RiskGauge({ risk }: { risk: RiskUtilization }) {
  const gc = GUARD_COLOR[risk.dailyLossGuardStatus]

  return (
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {/* Header */}
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ RISK UTILIZATION ]</span>
      </div>

      <div className="px-4 py-5 space-y-5">
        <Bar label="POSITION LIMIT" pct={risk.positionUtilPct} />
        <Bar label="TOTAL DEPLOYED" pct={risk.totalDeployedUtilPct} />

        <hr className="term-divider" />

        {/* Daily loss guard */}
        <div className="flex items-center justify-between">
          <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
            DAILY LOSS GUARD
          </span>
          <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: gc, textTransform: "uppercase" }}>
            <span style={{ marginRight: "5px" }}>●</span>
            {risk.dailyLossGuardStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  )
}
