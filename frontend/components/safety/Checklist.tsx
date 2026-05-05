import Card from "@/components/ui/Card"

const items = [
  { label: "Hot wallet funded with SOL for gas", done: true },
  { label: "node-helper/index.js wired to @meteora-ag/dlmm", done: false },
  { label: "SOLANA_RPC_URL set to mainnet endpoint", done: false },
  { label: "DRY_RUN=true verified in .env, then set false only after review", done: true },
  { label: "Kill switch file absent at KILL_SWITCH_FILE path", done: true },
  { label: "Postgres reachable and schema migrated", done: true },
]

export default function Checklist() {
  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
        Before going live — checklist
      </h2>
      <ul className="space-y-3">
        {items.map(({ label, done }) => (
          <li key={label} className="flex items-start gap-3 text-sm">
            <span
              className="mt-0.5 w-4 h-4 rounded flex items-center justify-center text-xs flex-shrink-0"
              style={{
                background: done ? "#14f19520" : "#1a1a1a",
                border: `1px solid ${done ? "#14f195" : "#333"}`,
                color: done ? "#14f195" : "#444",
              }}
              aria-label={done ? "done" : "not done"}
            >
              {done ? "✓" : ""}
            </span>
            <span style={{ color: done ? "#f5f5f5" : "#888888" }}>{label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-4" style={{ color: "#444444" }}>
        Read-only view — update via .env and agent config.
      </p>
    </Card>
  )
}
