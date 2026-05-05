import { getAgentStatus, getKpiSummary, getActivity, getRiskUtilization } from "@/lib/api"
import StatusRow from "@/components/dashboard/StatusRow"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import RiskGauge from "@/components/dashboard/RiskGauge"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [status, kpi, activity, risk] = await Promise.all([
    getAgentStatus(),
    getKpiSummary(),
    getActivity(20),
    getRiskUtilization(),
  ])

  const fmt = (n: number, prefix = "$") =>
    `${prefix}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const pnlSign = kpi.pnlDayUsd >= 0 ? "+" : ""

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "#f5f5f5" }}>
          Live Dashboard
        </h1>
        <p className="text-sm" style={{ color: "#888888" }}>
          Mock data — connect{" "}
          <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: "#1a1a1a", color: "#14f195" }}>
            NEXT_PUBLIC_API_URL
          </code>{" "}
          to fetch real agent data.
        </p>
      </div>

      {/* Status bar */}
      <div className="mb-8">
        <StatusRow status={status} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${kpi.maxPositionUsd > 0 ? kpi.openPositions : "—"} open`} accent index={0} />
        <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
        <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
        <KpiCard label="PnL (today)" value={`${pnlSign}${fmt(kpi.pnlDayUsd)}`} sub={`week: ${pnlSign}${fmt(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} />
      </div>

      {/* Activity + Risk side by side */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed items={activity} />
        </div>
        <div>
          <RiskGauge risk={risk} />
        </div>
      </div>
    </div>
  )
}
