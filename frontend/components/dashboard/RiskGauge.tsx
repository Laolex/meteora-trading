import type { RiskUtilization } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import Card from "@/components/ui/Card"

function Bar({ label, pct }: { label: string; pct: number }) {
  const color = pct > 80 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#14f195"
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: "#888888" }}>{label}</span>
        <span className="text-xs font-mono font-medium" style={{ color }}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1a1a1a" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function RiskGauge({ risk }: { risk: RiskUtilization }) {
  const guardColor = risk.dailyLossGuardStatus === "ok"
    ? "green"
    : risk.dailyLossGuardStatus === "warning"
    ? "amber"
    : "red"

  return (
    <Card>
      <p className="text-xs uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
        Risk Utilization
      </p>
      <div className="space-y-4">
        <Bar label="Position limit used" pct={risk.positionUtilPct} />
        <Bar label="Total deployment used" pct={risk.totalDeployedUtilPct} />
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs" style={{ color: "#888888" }}>Daily loss guard</span>
          <Badge variant={guardColor} dot>{risk.dailyLossGuardStatus}</Badge>
        </div>
      </div>
    </Card>
  )
}
