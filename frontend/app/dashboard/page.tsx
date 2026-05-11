import { getAgentStatus, getKpiSummary, getActivity, getRiskUtilization, getSafetyConfig, getAgentState } from "@/lib/api"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import CollapsibleSection from "@/components/dashboard/CollapsibleSection"
import SettingsModal from "@/components/dashboard/SettingsModal"
import StatusRow from "@/components/dashboard/StatusRow"
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
    <div className="crt-scanlines min-h-[100dvh] pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">

      {/* Terminal header */}
      <div className="mb-3" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "16px" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-mono font-black leading-none mb-1"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "#eaeaea", textTransform: "uppercase" }}
            >
              METEORA AGENT
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              AUTONOMOUS DLMM LIQUIDITY
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="ops-badge">OPS CONSOLE</span>
              <SettingsModal status={status} risk={risk} agentState={agentState} safety={safety} />
            </div>
            <div className="font-mono flex items-center gap-2" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#333" }}>
              <span className="inline-block w-1.5 h-1.5" style={{ background: "#14f195", boxShadow: "0 0 4px #14f195" }} />
              UPDATED {fetchedAt}
            </div>
          </div>
        </div>

      </div>

      {/* Status flex heading */}
      <StatusRow status={status} />

      {/* Main grid — gap below status row */}
      <div
        className="grid gap-0 lg:grid-cols-[220px,1fr] items-start mt-px"
        style={{ gap: "1px", background: "#1e1e1e", marginTop: "1px" }}
      >
        {/* Left sidebar: Vault only */}
        <div style={{ background: "#0A0A0A" }}>
          <div className="lg:sticky lg:top-24" style={{ borderRight: "1px solid #1e1e1e" }}>
            <VaultPanel />
          </div>
        </div>

        {/* Main content */}
        <div style={{ background: "#0A0A0A" }}>

          <CollapsibleSection label="[ METRICS ]" badge={`${kpi.openPositions} OPEN`} defaultOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "1px", background: "#1e1e1e" }}>
              <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${safety.maxOpenPositions} open`} accent index={0} />
              <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
              <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
              <KpiCard label="PnL Today" value={fmtPnl(kpi.pnlDayUsd)} sub={`week: ${fmtPnl(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} delta={pnlDelta} deltaPositive={pnlDeltaPositive} />
            </div>
          </CollapsibleSection>

          <div style={{ borderTop: "1px solid #1e1e1e" }}>
            <CollapsibleSection label="[ SESSION ]" badge={status.mode} defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "1px", background: "#1e1e1e" }}>
                {[
                  { label: "NETWORK",   value: status.network.toUpperCase() },
                  { label: "POSITIONS", value: `${kpi.openPositions} / ${safety.maxOpenPositions}` },
                  { label: "LOSS CAP",  value: `${safety.dailyLossLimitPct}%` },
                  { label: "POS UTIL",  value: `${risk.positionUtilPct.toFixed(0)}%` },
                  { label: "DEPLOYED",  value: fmt(kpi.totalDeployedUsd) },
                  { label: "DEP LIMIT", value: fmt(kpi.maxTotalDeployedUsd) },
                  { label: "PNL DAY",   value: fmtPnl(kpi.pnlDayUsd) },
                  { label: "PNL WEEK",  value: fmtPnl(kpi.pnlWeekUsd) },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3 font-mono" style={{ background: "#0d0d0d" }}>
                    <div style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#444", textTransform: "uppercase", marginBottom: "4px" }}>
                      {label}
                    </div>
                    <div style={{ fontSize: "11px", color: "#aaa", letterSpacing: "0.04em" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>

          <div style={{ borderTop: "1px solid #1e1e1e", background: "#0A0A0A" }}>
            <ActivityFeed items={activity} />
          </div>
        </div>
      </div>
    </div>
  )
}
