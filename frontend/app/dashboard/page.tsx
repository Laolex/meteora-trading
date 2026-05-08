import { getAgentStatus, getKpiSummary, getActivity, getRiskUtilization, getSafetyConfig, getAgentState } from "@/lib/api"
import StatusRow from "@/components/dashboard/StatusRow"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import RiskGauge from "@/components/dashboard/RiskGauge"
import DashboardSidebar from "@/components/dashboard/Sidebar"
import AdminPanel from "@/components/dashboard/AdminPanel"
import AgentStatePanel from "@/components/dashboard/AgentStatePanel"
import FundAgentPanel from "@/components/dashboard/FundAgentPanel"
import WalletBalancePanel from "@/components/dashboard/WalletBalance"
import VaultPanel from "@/components/ui/VaultPanel"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const [status, kpi, activity, risk, safety, agentState] = await Promise.all([
    getAgentStatus(),
    getKpiSummary(),
    getActivity(20),
    getRiskUtilization(),
    getSafetyConfig(),
    getAgentState(),
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

  const fetchedAt = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  })

  return (
    <div className="crt-scanlines min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">

      {/* Terminal header */}
      <div className="mb-6" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "16px" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-mono font-black leading-none mb-1"
              style={{
                fontSize: "clamp(1.4rem, 3vw, 2rem)",
                letterSpacing: "-0.03em",
                color: "#eaeaea",
                textTransform: "uppercase",
              }}
            >
              METEORA AGENT
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              AUTONOMOUS DLMM LIQUIDITY  //  {process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "MOCK DATA"}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="ops-badge">OPS CONSOLE</span>
            <div className="font-mono flex items-center gap-2" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#333" }}>
              <span
                className="inline-block w-1.5 h-1.5"
                style={{ background: "#14f195", boxShadow: "0 0 4px #14f195" }}
              />
              UPDATED {fetchedAt}
            </div>
          </div>
        </div>

        {/* Ticker / metadata strip */}
        <div
          className="flex flex-wrap gap-0 mt-4 font-mono"
          style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#383838", textTransform: "uppercase" }}
        >
          {[
            `MODE: ${status.mode}`,
            `NET: ${status.network}`,
            `SVC: ${status.serviceStatus}`,
            `REV 2.6`,
            `UNIT / D-01`,
            `///`,
          ].map((item, i) => (
            <span key={i} style={{ marginRight: "16px" }}>{item}</span>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-6">
        <StatusRow status={status} />
      </div>

      {/* Admin panel */}
      <AdminPanel initialArmed={status.killSwitchPresent} />

      <div className="grid gap-0 lg:grid-cols-[260px,1fr] items-start" style={{ gap: "1px", background: "#1e1e1e" }}>
        {/* Left sidebar */}
        <div style={{ background: "#0A0A0A" }}>
          <div className="lg:sticky lg:top-24 space-y-0" style={{ borderRight: "1px solid #1e1e1e" }}>
            <DashboardSidebar status={status} kpi={kpi} risk={risk} safety={safety} />
            <WalletBalancePanel />
            <FundAgentPanel />
            <AgentStatePanel initialState={agentState} />
            <VaultPanel />
          </div>
        </div>

        {/* Main content */}
        <div style={{ background: "#0A0A0A" }}>
          {/* KPI grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4" style={{ borderBottom: "1px solid #1e1e1e" }}>
            <div style={{ borderRight: "1px solid #1e1e1e" }}>
              <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${safety.maxOpenPositions} open`} accent index={0} />
            </div>
            <div style={{ borderRight: "1px solid #1e1e1e" }}>
              <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
            </div>
            <div style={{ borderRight: "1px solid #1e1e1e" }}>
              <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
            </div>
            <div>
              <KpiCard label="PnL Today" value={fmtPnl(kpi.pnlDayUsd)} sub={`week: ${fmtPnl(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} delta={pnlDelta} deltaPositive={pnlDeltaPositive} />
            </div>
          </div>

          {/* Activity + Risk */}
          <div className="grid lg:grid-cols-3" style={{ gap: "1px", background: "#1e1e1e" }}>
            <div className="lg:col-span-2" style={{ background: "#0A0A0A" }}>
              <ActivityFeed items={activity} />
            </div>
            <div style={{ background: "#0A0A0A" }}>
              <RiskGauge risk={risk} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
