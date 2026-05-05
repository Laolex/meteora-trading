import Link from "next/link"
import type { AgentStatus, KpiSummary, RiskUtilization, SafetyConfig } from "@/lib/api"
import Badge from "@/components/ui/Badge"
import Card from "@/components/ui/Card"

interface DashboardSidebarProps {
  status: AgentStatus
  kpi: KpiSummary
  risk: RiskUtilization
  safety: SafetyConfig
}

function statusVariant(ok: boolean) {
  return ok ? "green" : "red"
}

export default function DashboardSidebar({ status, kpi, risk, safety }: DashboardSidebarProps) {
  return (
    <aside className="space-y-4">
      <Card className="space-y-4">
        <p className="text-xs uppercase tracking-wider" style={{ color: "#555555" }}>
          Session
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={status.mode === "DRY_RUN" ? "amber" : "green"} dot>{status.mode}</Badge>
          <Badge variant="neutral">{status.network}</Badge>
          <Badge variant={statusVariant(status.serviceStatus === "active")} dot>service</Badge>
        </div>
        <div className="text-xs space-y-2 font-mono" style={{ color: "#666666" }}>
          <p>open positions: {kpi.openPositions} / {safety.maxOpenPositions}</p>
          <p>daily loss cap: {safety.dailyLossLimitPct}%</p>
          <p>position utilization: {risk.positionUtilPct.toFixed(0)}%</p>
        </div>
      </Card>

      <Card className="space-y-3" elevated>
        <p className="text-xs uppercase tracking-wider" style={{ color: "#555555" }}>
          Navigate
        </p>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/dashboard" className="hover:text-[#14f195] transition-colors" style={{ color: "#f5f5f5" }}>
            Overview
          </Link>
          <Link href="/safety" className="hover:text-[#14f195] transition-colors" style={{ color: "#888888" }}>
            Safety controls
          </Link>
          <Link href="/architecture" className="hover:text-[#14f195] transition-colors" style={{ color: "#888888" }}>
            Architecture
          </Link>
          <Link href="/proof" className="hover:text-[#14f195] transition-colors" style={{ color: "#888888" }}>
            Proof of operation
          </Link>
        </nav>
      </Card>
    </aside>
  )
}
