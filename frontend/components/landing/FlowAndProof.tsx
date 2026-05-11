"use client"

import { motion } from "motion/react"
import { viewportOnce, ease, staggerContainer, cardReveal } from "@/lib/motion"
import type { ProofSnapshot } from "@/lib/api"

interface Props {
  proof: ProofSnapshot
}

const steps = [
  {
    n: "01",
    title: "Discover Pools",
    description: "Pull the full Meteora DLMM universe via API. Filter by liquidity, age, and token quality.",
  },
  {
    n: "02",
    title: "Score & Decide",
    description: "Rank by a weighted composite: fees/24h, volume/TVL, bin liquidity depth, token quality.",
  },
  {
    n: "03",
    title: "Risk Gate",
    description: "Check kill switch, position caps, total deployment limit, and daily loss guard before any execution.",
  },
  {
    n: "04",
    title: "Execute & Monitor",
    description: "Hot wallet signs via node-helper. Every action logs to Postgres. Rebalances if price drifts.",
  },
]

export default function FlowAndProof({ proof }: Props) {
  const latestAction = proof.recentActions[0]
  const actionSummary = latestAction
    ? `${latestAction.actionType} on ${latestAction.poolName} — ${latestAction.reason}`
    : "no actions yet"
  const dbStatus =
    proof.recentActions.length > 0
      ? `actions_log populated (${proof.recentActions.length} recent)`
      : "no DB writes yet"
  const gitHead = proof.gitLog[0] ?? "unavailable"

  const receipts = [
    { label: "agent status", value: `${proof.agentMode} on ${proof.agentNetwork}`, color: "#14f195" },
    { label: "dry-run DB writes", value: dbStatus, color: proof.recentActions.length > 0 ? "#14f195" : "#f59e0b" },
    { label: "latest decision", value: actionSummary, color: "#14f195" },
    { label: "git HEAD", value: gitHead, color: "#666" },
  ]

  return (
    <section
      id="flow"
      className="py-28 md:py-36 px-4 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto w-full space-y-24">

        {/* how it works */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={viewportOnce}
            transition={{ duration: 0.75, ease }}
            className="mb-14"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-medium mb-5"
              style={{ background: "rgba(20,241,149,0.08)", color: "#14f195", border: "1px solid rgba(20,241,149,0.15)" }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: "#14f195" }} />
              The loop
            </span>
            <h2 className="text-3xl md:text-5xl font-bold" style={{ color: "#f0f0f0", letterSpacing: "-0.025em" }}>
              How it works
            </h2>
          </motion.div>

          {/* connected timeline steps */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid md:grid-cols-4 gap-4 relative"
          >
            {/* connecting line (desktop) */}
            <div
              className="hidden md:block absolute top-9 left-[12.5%] right-[12.5%] h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(20,241,149,0.2), rgba(20,241,149,0.2), transparent)" }}
              aria-hidden
            />

            {steps.map(({ n, title, description }, i) => (
              <motion.div
                key={n}
                variants={cardReveal}
              >
                {/* outer shell */}
                <div
                  style={{
                    padding: "5px",
                    borderRadius: "1.75rem",
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <motion.div
                    className="flex flex-col px-6 py-7 h-full"
                    style={{
                      borderRadius: "calc(1.75rem - 5px)",
                      background: "linear-gradient(160deg, rgba(16,22,30,0.92) 0%, rgba(12,18,26,0.86) 100%)",
                      border: "1px solid rgba(20,241,149,0.08)",
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
                    }}
                    whileHover={{
                      borderColor: "rgba(20,241,149,0.22)",
                      boxShadow: "0 0 24px rgba(20,241,149,0.07), inset 0 1px 1px rgba(255,255,255,0.07)",
                    }}
                    transition={{ duration: 0.22 }}
                  >
                    {/* step number with glow dot */}
                    <div className="flex items-center gap-2 mb-5">
                      <span
                        className="font-mono text-2xl font-bold"
                        style={{ color: "#14f195", letterSpacing: "-0.04em", textShadow: "0 0 20px rgba(20,241,149,0.4)" }}
                      >
                        {n}
                      </span>
                      {i < steps.length - 1 && (
                        <span
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ background: "rgba(20,241,149,0.3)" }}
                          aria-hidden
                        />
                      )}
                    </div>
                    <h3 className="text-base font-semibold mb-3" style={{ color: "#f0f0f0", letterSpacing: "-0.015em" }}>
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#7a7a7a" }}>
                      {description}
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* proof of operation */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={viewportOnce}
            transition={{ duration: 0.75, ease }}
            className="mb-14"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-medium mb-5"
              style={{ background: "rgba(20,241,149,0.08)", color: "#14f195", border: "1px solid rgba(20,241,149,0.15)" }}
            >
              <span className="w-1 h-1 rounded-full" style={{ background: "#14f195" }} />
              Live receipts
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-3" style={{ color: "#f0f0f0", letterSpacing: "-0.025em" }}>
              Proof of operation
            </h2>
            <p className="text-base" style={{ color: "#555" }}>
              The agent runs. These aren&apos;t mock screenshots.
            </p>
          </motion.div>

          {/* terminal — double-bezel */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={viewportOnce}
            transition={{ duration: 0.85, ease }}
          >
            <div
              style={{
                padding: "5px",
                borderRadius: "1.75rem",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="overflow-hidden font-mono text-sm"
                style={{
                  borderRadius: "calc(1.75rem - 5px)",
                  background: "linear-gradient(160deg, rgba(8,12,18,0.98) 0%, rgba(6,10,16,0.95) 100%)",
                  border: "1px solid rgba(20,241,149,0.1)",
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04)",
                }}
              >
                {/* terminal chrome */}
                <div
                  className="flex items-center gap-2 px-5 py-3.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3a" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#3a3a3a" }} />
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(20,241,149,0.5)" }} />
                  <span className="ml-3 text-xs font-mono" style={{ color: "#333" }}>
                    agent@vps ~ meteora-agent
                  </span>
                </div>
                <div className="p-7 space-y-4">
                  {receipts.map(({ label, value, color }, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={viewportOnce}
                      transition={{ duration: 0.45, ease, delay: i * 0.1 }}
                    >
                      <span style={{ color: "#2a2a2a" }}>$ </span>
                      <span style={{ color: "#444" }}>{label} </span>
                      <span style={{ color: "#333" }}>→ </span>
                      <span style={{ color }}>{value}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
