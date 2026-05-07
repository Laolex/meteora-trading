"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import type { ProofSnapshot } from "@/lib/api"

interface TerminalBlockProps {
  title: string
  lines: { label?: string; value: string; color?: string }[]
  delay?: number
}

function TerminalBlock({ title, lines, delay = 0 }: TerminalBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, ease, delay }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #222222" }}
    >
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid #1a1a1a", background: "#0d0d0d" }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#f59e0b" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#14f195" }} />
        <span className="ml-2 text-xs font-mono" style={{ color: "#444444" }}>{title}</span>
      </div>
      <div
        className="p-4 font-mono text-xs space-y-1.5"
        style={{ background: "#0a0a0a" }}
      >
        {lines.map(({ label, value, color = "#f5f5f5" }, i) => (
          <div key={i} className="flex gap-2">
            {label && <span style={{ color: "#444444" }}>{label}</span>}
            <span style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

interface Props {
  proof: ProofSnapshot
}

export default function ReceiptsPanel({ proof }: Props) {
  const gitLines = proof.gitLog.length > 0
    ? [
        { label: "$", value: "git log --oneline -4", color: "#888888" },
        ...proof.gitLog.map((line) => ({ value: line })),
      ]
    : [
        { label: "$", value: "git log --oneline -4", color: "#888888" },
        { value: "no commits found", color: "#444444" },
      ]

  const agentLines = [
    { label: "$", value: "systemctl --user status meteora-agent", color: "#888888" },
    { value: "● meteora-agent.service — Meteora DLMM Autonomous Agent" },
    { value: `   Mode: ${proof.agentMode}, network=${proof.agentNetwork}`, color: "#f59e0b" },
    { value: `   DB: ${proof.dbReachable ? "connected" : "unreachable"}`, color: proof.dbReachable ? "#14f195" : "#ef4444" },
  ]

  const actionLines: { label?: string; value: string; color?: string }[] = [
    { label: "$", value: "SELECT action_type, pool_name, reason FROM actions_log ORDER BY id DESC LIMIT 3", color: "#888888" },
    { value: " action_type │ pool_name    │ reason", color: "#444444" },
    { value: "─────────────┼──────────────┼───────────────────────────────", color: "#333333" },
  ]

  if (proof.recentActions.length === 0) {
    actionLines.push({ value: " (no actions logged yet)", color: "#555555" })
  } else {
    for (const a of proof.recentActions) {
      const type = a.actionType.padEnd(12)
      const pool = (a.poolName ?? "unknown").substring(0, 12).padEnd(12)
      const reason = (a.reason ?? "").substring(0, 35)
      actionLines.push({ value: ` ${type} │ ${pool} │ ${reason}` })
    }
    actionLines.push({ value: `(${proof.recentActions.length} rows)`, color: "#888888" })
  }

  return (
    <div className="space-y-6">
      <TerminalBlock title="git log --oneline -4" delay={0} lines={gitLines} />
      <TerminalBlock title="systemctl status meteora-agent" delay={0.08} lines={agentLines} />
      <TerminalBlock title="actions_log (recent)" delay={0.16} lines={actionLines} />
    </div>
  )
}
