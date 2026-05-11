"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce, ease } from "@/lib/motion"
import type { SafetyConfig } from "@/lib/api"

interface Props {
  safety: SafetyConfig
}

const statusTone = (status: string) => {
  if (status === "active" || status === "pass" || status === "enforced" || status === "clear") return "#14f195"
  if (status === "armed" || status === "off") return "#f59e0b"
  return "#666"
}

export default function SafetyBlock({ safety }: Props) {
  const rails = [
    {
      label: "DRY_RUN Mode",
      status: safety.dryRun ? "active" : "off",
      description: "Agent runs the full loop — discovery, scoring, decisions — but no transactions are sent. Safe by default.",
    },
    {
      label: "Kill Switch",
      status: safety.killSwitchPresent ? "armed" : "clear",
      description: "Touch /var/kill and the agent stops within one loop iteration. No code changes, no restarts.",
    },
    {
      label: "Position Caps",
      status: "enforced",
      description: `Max $${safety.maxPositionUsd} per position · $${safety.maxTotalDeployedUsd} total deployed. Checked before every open.`,
    },
    {
      label: "Live Gate",
      status: safety.liveGatePass ? "pass" : "blocked",
      description: "Checklist of preconditions must all pass before DRY_RUN can be disabled: wallet, DB, RPC, node-helper.",
    },
  ]

  return (
    <section
      id="safety"
      className="py-28 md:py-36 px-4 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto">

        {/* section header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={viewportOnce}
          transition={{ duration: 0.75, ease }}
          className="mb-14"
        >
          <span
            className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-medium mb-5"
            style={{ background: "#0d0d0d", color: "#14f195", border: "1px solid #1e1e1e" }}
          >
            <span className="w-1 h-1" style={{ background: "#14f195" }} />
            Risk controls
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: "#f0f0f0", letterSpacing: "-0.025em" }}>
            Safety first. Every time.
          </h2>
          <p className="text-base max-w-xl" style={{ color: "#7a7a7a" }}>
            No feature ships that touches capital without a guard. These aren&apos;t fallbacks — they&apos;re primary controls.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid md:grid-cols-2 gap-4"
        >
          {rails.map(({ label, status, description }) => (
            <motion.div key={label} variants={cardReveal}>
              {/* outer shell */}
              <div style={{ padding: "1px", background: "#1e1e1e" }}>
                <motion.div
                  className="flex gap-5 p-6 h-full"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #141414",
                  }}
                  whileHover={{
                    borderColor: "#14f19566",
                  }}
                  transition={{ duration: 0.22 }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="font-semibold text-sm" style={{ color: "#f0f0f0", letterSpacing: "-0.01em" }}>{label}</h3>
                      <span
                        className="font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1"
                        style={{ color: statusTone(status), border: `1px solid ${statusTone(status)}55`, background: "#0a0a0a" }}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#7a7a7a" }}>{description}</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
