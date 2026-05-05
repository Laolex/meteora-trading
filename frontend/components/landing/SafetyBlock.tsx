"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce } from "@/lib/motion"
import Badge from "@/components/ui/Badge"

const rails = [
  {
    label: "DRY_RUN Mode",
    status: "active" as const,
    description: "Agent runs the full loop — discovery, scoring, decisions — but no transactions are sent. Safe by default.",
  },
  {
    label: "Kill Switch",
    status: "armed" as const,
    description: "Touch /var/kill and the agent stops within one loop iteration. No code changes, no restarts.",
  },
  {
    label: "Position Caps",
    status: "enforced" as const,
    description: "Hard limits on max position size and total deployed capital. Checked before every open.",
  },
  {
    label: "Live Gate",
    status: "pass" as const,
    description: "Checklist of preconditions must all pass before DRY_RUN can be disabled: wallet, DB, RPC, node-helper.",
  },
]

const badgeVariant = (status: string) => {
  if (status === "active" || status === "pass") return "green" as const
  if (status === "armed") return "amber" as const
  return "neutral" as const
}

export default function SafetyBlock() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#f5f5f5" }}>
          Safety first. Every time.
        </h2>
        <p className="text-base max-w-xl mx-auto" style={{ color: "#888888" }}>
          No feature ships that touches capital without a guard. These aren't fallbacks — they're primary controls.
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid md:grid-cols-2 gap-6"
      >
        {rails.map(({ label, status, description }) => (
          <motion.div
            key={label}
            variants={cardReveal}
            className="flex gap-4 p-6 rounded-2xl"
            style={{ background: "#111111", border: "1px solid #222222" }}
            whileHover={{ borderColor: "rgba(20,241,149,0.2)", boxShadow: "0 0 20px rgba(20,241,149,0.05)" }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-sm" style={{ color: "#f5f5f5" }}>{label}</h3>
                <Badge variant={badgeVariant(status)} dot>{status}</Badge>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>{description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
