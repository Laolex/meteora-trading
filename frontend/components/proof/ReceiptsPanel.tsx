import type { ProofSnapshot } from "@/lib/api"

interface TerminalBlockProps {
  title: string
  lines: { label?: string; value: string; color?: string }[]
}

function TerminalBlock({ title, lines }: TerminalBlockProps) {
  return (
    <div style={{ borderBottom: "1px solid #111" }}>
      <div
        className="px-4 py-2 flex items-center gap-3"
        style={{ borderBottom: "1px solid #111", background: "#0d0d0d" }}
      >
        <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#333", textTransform: "uppercase" }}>
          $
        </span>
        <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.06em", color: "#555" }}>
          {title}
        </span>
      </div>
      <div className="px-4 py-3 font-mono space-y-1" style={{ background: "#0a0a0a", fontSize: "10px", lineHeight: 1.65 }}>
        {lines.map(({ label, value, color = "#eaeaea" }, i) => (
          <div key={i} className="flex gap-2">
            {label && <span style={{ color: "#333", flexShrink: 0 }}>{label}</span>}
            <span style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReceiptsPanel({ proof }: { proof: ProofSnapshot }) {
  const gitLines = proof.gitLog.length > 0
    ? [
        { label: "$", value: "git log --oneline -4", color: "#555" },
        ...proof.gitLog.map((line) => ({ value: line })),
      ]
    : [
        { label: "$", value: "git log --oneline -4", color: "#555" },
        { value: "no commits found", color: "#333" },
      ]

  const agentLines = [
    { label: "$", value: "systemctl --user status meteora-agent", color: "#555" },
    { value: "● meteora-agent.service — Meteora DLMM Autonomous Agent" },
    { value: `   Mode: ${proof.agentMode}, network=${proof.agentNetwork}`, color: "#f59e0b" },
    { value: `   DB: ${proof.dbReachable ? "connected" : "unreachable"}`, color: proof.dbReachable ? "#14f195" : "#e61919" },
  ]

  const actionLines: { label?: string; value: string; color?: string }[] = [
    { label: "$", value: "SELECT action_type, pool_name, reason FROM actions_log ORDER BY id DESC LIMIT 3", color: "#555" },
    { value: " action_type │ pool_name    │ reason", color: "#333" },
    { value: "─────────────┼──────────────┼───────────────────────────────", color: "#222" },
  ]

  if (proof.recentActions.length === 0) {
    actionLines.push({ value: " (no actions logged yet)", color: "#2a2a2a" })
  } else {
    for (const a of proof.recentActions) {
      const type = a.actionType.padEnd(12)
      const pool = (a.poolName ?? "unknown").substring(0, 12).padEnd(12)
      const reason = (a.reason ?? "").substring(0, 35)
      actionLines.push({ value: ` ${type} │ ${pool} │ ${reason}` })
    }
    actionLines.push({ value: `(${proof.recentActions.length} rows)`, color: "#555" })
  }

  return (
    <div>
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414", background: "#0d0d0d" }}>
        <span className="term-label">[ RECEIPTS ]</span>
      </div>
      <TerminalBlock title="git log --oneline -4" lines={gitLines} />
      <TerminalBlock title="systemctl status meteora-agent" lines={agentLines} />
      <TerminalBlock title="actions_log (recent)" lines={actionLines} />
    </div>
  )
}
