import { getAgentStatus, getKpiSummary, getActivity, getRiskUtilization, getSafetyConfig } from "@/lib/api"
import StatusRow from "@/components/dashboard/StatusRow"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import RiskGauge from "@/components/dashboard/RiskGauge"
import DashboardSidebar from "@/components/dashboard/Sidebar"
import AdminPanel from "@/components/dashboard/AdminPanel"
import WalletBalancePanel from "@/components/dashboard/WalletBalance"
import VaultPanel from "@/components/ui/VaultPanel"

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

  const dailyAvgFromWeek = kpi.pnlWeekUsd / 7
  const pnlDelta = dailyAvgFromWeek !== 0
    ? `${Math.abs(((kpi.pnlDayUsd - dailyAvgFromWeek) / Math.abs(dailyAvgFromWeek)) * 100).toFixed(1)}% vs 7-day avg`
    : undefined
  const pnlDeltaPositive = kpi.pnlDayUsd >= dailyAvgFromWeek

  const fetchedAt = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#f5f5f5" }}>
            Live Dashboard
          </h1>
          <p className="text-xs font-mono" style={{ color: "#444444" }}>
            {process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "mock data"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#555555" }}>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: "#14f195", boxShadow: "0 0 4px #14f195" }}
          />
          Updated {fetchedAt}
        </div>
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
          <VaultPanel />
        </div>

        <div>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${safety.maxOpenPositions} open`} accent index={0} />
            <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
            <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
            <KpiCard label="PnL (today)" value={fmtPnl(kpi.pnlDayUsd)} sub={`week: ${fmtPnl(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} delta={pnlDelta} deltaPositive={pnlDeltaPositive} />
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
