"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"

const receipts = [
  {
    label: "systemd status",
    value: "active (running)",
    color: "#14f195",
  },
  {
    label: "dry-run DB writes",
    value: "actions_log populated",
    color: "#14f195",
  },
  {
    label: "pytest",
    value: "15 passed, 0 failed",
    color: "#14f195",
  },
]

export default function ProofBlock() {
  return (
    <section
      className="py-24 px-6"
      style={{ background: "#111111", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold mb-4 text-center"
          style={{ color: "#f5f5f5" }}
        >
          Proof of operation
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-center text-sm mb-12"
          style={{ color: "#888888" }}
        >
          The agent runs. These aren't mock screenshots.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease }}
          className="rounded-2xl overflow-hidden font-mono text-sm"
          style={{ background: "#0d0d0d", border: "1px solid #222222" }}
        >
          {/* terminal header */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid #1a1a1a" }}>
            <span className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#14f195" }} />
            <span className="ml-2 text-xs" style={{ color: "#444444" }}>agent@vps ~ meteora-agent</span>
          </div>

          <div className="p-6 space-y-4">
            {receipts.map(({ label, value }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.4, delay: i * 0.12 }}
              >
                <span style={{ color: "#444444" }}>$ </span>
                <span style={{ color: "#888888" }}>{label} → </span>
                <span style={{ color: receipts[i].color }}>{value}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
