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
    <div>
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ PRE-LIVE CHECKLIST ]</span>
      </div>
      <div>
        {items.map(({ label, done, detail }) => (
          <div
            key={label}
            className="px-4 py-3 flex items-start gap-3"
            style={{ borderBottom: "1px solid #111" }}
          >
            <span
              className="font-mono flex-shrink-0 mt-0.5"
              style={{
                fontSize: "9px",
                letterSpacing: "0.08em",
                padding: "1px 5px",
                border: `1px solid ${done ? "#14f195" : "#2a2a2a"}`,
                color: done ? "#14f195" : "#2a2a2a",
                background: done ? "#14f1950d" : "transparent",
              }}
            >
              {done ? "OK" : "··"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-mono" style={{ fontSize: "10px", color: done ? "#888" : "#3a3a3a", letterSpacing: "0.03em" }}>
                {label}
              </div>
              {detail && (
                <div className="font-mono mt-0.5" style={{ fontSize: "9px", color: done ? "#14f19560" : "#2a2a2a", letterSpacing: "0.06em" }}>
                  [{detail}]
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-2">
        <span className="font-mono" style={{ fontSize: "8px", color: "#2a2a2a", letterSpacing: "0.06em" }}>
          LIVE DATA — UPDATE VIA .ENV AND AGENT CONFIG
        </span>
      </div>
    </div>
  )
}
