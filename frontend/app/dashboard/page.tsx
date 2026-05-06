import { getAgentStatus, getKpiSummary, getActivity, getRiskUtilization, getSafetyConfig } from "@/lib/api"
import StatusRow from "@/components/dashboard/StatusRow"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import RiskGauge from "@/components/dashboard/RiskGauge"
import DashboardSidebar from "@/components/dashboard/Sidebar"
import AdminPanel from "@/components/dashboard/AdminPanel"
import WalletBalancePanel from "@/components/dashboard/WalletBalance"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [status, kpi, activity, risk, safety] = await Promise.all([
    getAgentStatus(),
    getKpiSummary(),
    getActivity(20),
    getRiskUtilization(),
    getSafetyConfig(),
  ])

  const fmt = (n: number) => {
    const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `$${abs}`
  }

  const fmtPnl = (n: number) => `${n >= 0 ? "+" : "-"}${fmt(n)}`

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

      {/* Admin panel — only renders when JWT is valid */}
      <AdminPanel initialArmed={status.killSwitchPresent} />

      <div className="grid gap-6 lg:grid-cols-[280px,1fr] items-start">
        <div className="lg:sticky lg:top-24 space-y-4">
          <DashboardSidebar status={status} kpi={kpi} risk={risk} safety={safety} />
          <WalletBalancePanel />
        </div>

        <div>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${safety.maxOpenPositions} open`} accent index={0} />
            <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
            <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
            <KpiCard label="PnL (today)" value={fmtPnl(kpi.pnlDayUsd)} sub={`week: ${fmtPnl(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} />
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
      </div>
    </div>
  )
}
