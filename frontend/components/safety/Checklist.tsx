import Card from "@/components/ui/Card"
import type { SafetyConfig, WalletBalance } from "@/lib/api"

interface Props {
  safety: SafetyConfig
  wallet: WalletBalance
  dbReachable: boolean
}

export default function Checklist({ safety, wallet, dbReachable }: Props) {
  const items = [
    {
      label: "Hot wallet funded with SOL for gas",
      done: wallet.solBalance > 0.01,
      detail: `${wallet.solBalance.toFixed(4)} SOL`,
    },
    {
      label: "node-helper/index.js wired to @meteora-ag/dlmm",
      done: false,
      detail: "pending mainnet prep",
    },
    {
      label: "SOLANA_RPC_URL set to mainnet endpoint",
      done: safety.network === "mainnet",
      detail: safety.network,
    },
    {
      label: "DRY_RUN=true verified in .env",
      done: safety.dryRun,
      detail: safety.dryRun ? "active" : "disabled",
    },
    {
      label: "Kill switch file absent (normal operation)",
      done: !safety.killSwitchPresent,
      detail: !safety.killSwitchPresent ? "clear" : "armed",
    },
    {
      label: "Postgres reachable and schema migrated",
      done: dbReachable,
      detail: dbReachable ? "connected" : "unreachable",
    },
  ]

  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
        Before going live — checklist
      </h2>
      <ul className="space-y-3">
        {items.map(({ label, done, detail }) => (
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
            <span style={{ color: done ? "#f5f5f5" : "#888888" }}>
              {label}
              {detail && (
                <span className="ml-2 font-mono text-xs" style={{ color: done ? "#14f19580" : "#444" }}>
                  [{detail}]
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-4" style={{ color: "#444444" }}>
        Live data — update via .env and agent config.
      </p>
    </Card>
  )
}
