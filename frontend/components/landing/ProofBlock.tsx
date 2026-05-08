"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import type { ProofSnapshot } from "@/lib/api"

interface Props {
  proof: ProofSnapshot
}

export default function ProofBlock({ proof }: Props) {
  const latestAction = proof.recentActions[0]
  const actionSummary = latestAction
    ? `${latestAction.actionType} on ${latestAction.poolName} — ${latestAction.reason}`
    : "no actions yet"
  const dbStatus = proof.recentActions.length > 0
    ? `actions_log populated (${proof.recentActions.length} recent)`
    : "no DB writes yet"
  const gitHead = proof.gitLog[0] ?? "unavailable"

  const receipts = [
    { label: "agent status", value: `${proof.agentMode} on ${proof.agentNetwork}`, color: "#14f195" },
    { label: "dry-run DB writes", value: dbStatus, color: proof.recentActions.length > 0 ? "#14f195" : "#f59e0b" },
    { label: "latest decision", value: actionSummary, color: "#14f195" },
    { label: "git HEAD", value: gitHead, color: "#888888" },
  ]
  return (
    <section
      id="proof"
      className="min-h-svh flex flex-col justify-center py-20 md:py-24 px-6 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col justify-center">
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
          className="text-center text-sm mb-10"
          style={{ color: "#a3a3a3" }}
        >
          The agent runs. These aren&apos;t mock screenshots.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.7, ease }}
             className="rounded-3xl overflow-hidden font-mono text-sm"
             style={{
               background: "linear-gradient(180deg, rgba(23,28,35,0.78) 0%, rgba(23,28,35,0.62) 100%)",
               border: "1px solid rgba(20,241,149,0.1)",
               backdropFilter: "blur(5px)",
             }}
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
