import type { SafetyConfig } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import Card from "@/components/ui/Card"

const fmt = (n: number) => `$${n.toLocaleString()}`

export default function ControlsPanel({ config }: { config: SafetyConfig }) {
  const rows = [
    {
      label: "DRY_RUN",
      value: config.dryRun ? "enabled" : "disabled",
      badge: config.dryRun ? ("amber" as const) : ("red" as const),
      note: config.dryRun ? "No transactions sent" : "Live execution active",
    },
    {
      label: "Kill Switch",
      value: config.killSwitchPresent ? "present" : "absent",
      badge: config.killSwitchPresent ? ("red" as const) : ("green" as const),
      note: config.killSwitchPresent ? "Agent will stop at next loop" : "Agent running normally",
    },
    {
      label: "Live Gate",
      value: config.liveGatePass ? "pass" : "fail",
      badge: config.liveGatePass ? ("green" as const) : ("red" as const),
      note: "Pre-live checklist status",
    },
    {
      label: "Network",
      value: config.network,
      badge: config.network === "mainnet" ? ("red" as const) : ("blue" as const),
      note: config.network === "mainnet" ? "Real capital at risk" : "Test environment",
    },
  ]

  const limits = [
    { label: "Max position size", value: fmt(config.maxPositionUsd) },
    { label: "Max total deployed", value: fmt(config.maxTotalDeployedUsd) },
    { label: "Daily loss limit", value: `${config.dailyLossLimitPct}%` },
    { label: "Max open positions", value: String(config.maxOpenPositions) },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
          Runtime controls
        </h2>
        <div className="space-y-4">
          {rows.map(({ label, value, badge, note }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "#f5f5f5" }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#888888" }}>{note}</p>
              </div>
              <Badge variant={badge} dot>{value}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
          Hard limits
        </h2>
        <table className="w-full text-sm">
          <tbody>
            {limits.map(({ label, value }) => (
              <tr key={label} style={{ borderBottom: "1px solid #1a1a1a" }}>
                <td className="py-2.5" style={{ color: "#888888" }}>{label}</td>
                <td className="py-2.5 text-right font-mono font-medium" style={{ color: "#f5f5f5" }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
