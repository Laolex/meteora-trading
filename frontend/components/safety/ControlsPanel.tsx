import type { SafetyConfig } from "@/lib/api"

const fmt = (n: number) => `$${n.toLocaleString()}`

function StatusToken({ variant, children }: { variant: "green" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  const color = variant === "green" ? "#14f195" : variant === "amber" ? "#f59e0b" : variant === "red" ? "#e61919" : "#60a5fa"
  return (
    <span
      className="font-mono"
      style={{
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "2px 7px",
        border: `1px solid ${color}50`,
        color,
        background: `${color}0d`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  )
}

export default function ControlsPanel({ config }: { config: SafetyConfig }) {
  const rows = [
    {
      label: "DRY_RUN",
      value: config.dryRun ? "ENABLED" : "DISABLED",
      variant: config.dryRun ? ("amber" as const) : ("red" as const),
      note: config.dryRun ? "No transactions sent" : "Live execution active",
    },
    {
      label: "KILL SWITCH",
      value: config.killSwitchPresent ? "PRESENT" : "ABSENT",
      variant: config.killSwitchPresent ? ("red" as const) : ("green" as const),
      note: config.killSwitchPresent ? "Agent will stop at next loop" : "Agent running normally",
    },
    {
      label: "LIVE GATE",
      value: config.liveGatePass ? "PASS" : "FAIL",
      variant: config.liveGatePass ? ("green" as const) : ("red" as const),
      note: "Pre-live checklist status",
    },
    {
      label: "NETWORK",
      value: config.network,
      variant: config.network === "mainnet" ? ("red" as const) : ("blue" as const),
      note: config.network === "mainnet" ? "Real capital at risk" : "Test environment",
    },
  ]

  const limits = [
    { label: "MAX POSITION SIZE", value: fmt(config.maxPositionUsd) },
    { label: "MAX TOTAL DEPLOYED", value: fmt(config.maxTotalDeployedUsd) },
    { label: "DAILY LOSS LIMIT", value: `${config.dailyLossLimitPct}%` },
    { label: "MAX OPEN POSITIONS", value: String(config.maxOpenPositions) },
  ]

  return (
    <div>
      {/* Runtime controls */}
      <div style={{ borderBottom: "1px solid #1e1e1e" }}>
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
          <span className="term-label">[ RUNTIME CONTROLS ]</span>
        </div>
        <div>
          {rows.map(({ label, value, variant, note }) => (
            <div
              key={label}
              className="px-4 py-3 flex items-center justify-between gap-4"
              style={{ borderBottom: "1px solid #111" }}
            >
              <div>
                <div className="font-mono" style={{ fontSize: "10px", letterSpacing: "0.08em", color: "#888", textTransform: "uppercase" }}>
                  {label}
                </div>
                <div className="font-mono mt-0.5" style={{ fontSize: "9px", color: "#3a3a3a", letterSpacing: "0.04em" }}>
                  {note}
                </div>
              </div>
              <StatusToken variant={variant}>{value}</StatusToken>
            </div>
          ))}
        </div>
      </div>

      {/* Hard limits */}
      <div>
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
          <span className="term-label">[ HARD LIMITS ]</span>
        </div>
        <table className="w-full font-mono" style={{ fontSize: "10px" }}>
          <tbody>
            {limits.map(({ label, value }) => (
              <tr key={label} style={{ borderBottom: "1px solid #111" }}>
                <td className="px-4 py-2.5" style={{ color: "#444", letterSpacing: "0.08em" }}>{label}</td>
                <td className="px-4 py-2.5 text-right font-bold" style={{ color: "#eaeaea", letterSpacing: "0.04em" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
