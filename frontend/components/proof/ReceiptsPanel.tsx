"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"

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

export default function ReceiptsPanel() {
  return (
    <div className="space-y-6">
      <TerminalBlock
        title="git log --oneline -3"
        delay={0}
        lines={[
          { label: "$", value: "git log --oneline -3", color: "#888888" },
          { value: "a3f91bc feat: discovery scorer with weighted composite score" },
          { value: "82d0e14 feat: risk guard — position cap + daily loss limit" },
          { value: "c19a2f7 feat: node-helper stdio bridge for Meteora SDK calls" },
        ]}
      />

      <TerminalBlock
        title="systemctl status meteora-agent"
        delay={0.08}
        lines={[
          { label: "$", value: "systemctl --user status meteora-agent", color: "#888888" },
          { value: "● meteora-agent.service — Meteora DLMM Autonomous Agent" },
          { value: "   Loaded: loaded (/etc/systemd/user/meteora-agent.service)" },
          { value: "   Active: active (running) since Tue 2026-05-05 00:00:01 UTC", color: "#14f195" },
          { value: "   Main PID: 12847 (python)" },
          { value: "   Loop: DRY_RUN=true, network=devnet", color: "#f59e0b" },
        ]}
      />

      <TerminalBlock
        title="pytest -q"
        delay={0.16}
        lines={[
          { label: "$", value: "pytest -q", color: "#888888" },
          { value: "...............                                              [100%]" },
          { value: "15 passed in 1.34s", color: "#14f195" },
        ]}
      />

      <TerminalBlock
        title="actions_log (recent)"
        delay={0.24}
        lines={[
          { label: "$", value: "psql -c 'SELECT action_type,reason,decided_at FROM actions_log ORDER BY id DESC LIMIT 3'", color: "#888888" },
          { value: " action_type │ reason                          │ decided_at", color: "#444444" },
          { value: "─────────────┼─────────────────────────────────┼────────────────────────" , color: "#333333" },
          { value: " open        │ top-scored pool, bins in range  │ 2026-05-05 01:00:00+00" },
          { value: " claim       │ fee threshold reached            │ 2026-05-05 02:15:00+00" },
          { value: " rebalance   │ drift > 200 bps from entry      │ 2026-05-05 03:30:00+00" },
          { value: "(3 rows)", color: "#888888" },
        ]}
      />
    </div>
  )
}
