"use client"

import { useEffect, useMemo, useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"

import type { AgentState, AgentStatus, KpiSummary, RiskUtilization, SafetyConfig } from "@/lib/api"
import { API_BASE } from "@/lib/api"
import { getToken, isAuthenticated } from "@/lib/auth"
import KpiCard from "@/components/dashboard/KpiCard"
import ActivityFeed from "@/components/dashboard/ActivityFeed"
import CollapsibleSection from "@/components/dashboard/CollapsibleSection"
import SettingsModal from "@/components/dashboard/SettingsModal"
import StatusRow from "@/components/dashboard/StatusRow"
import RefreshButton from "@/components/dashboard/RefreshButton"
import VaultPanel from "@/components/ui/VaultPanel"

export const dynamic = "force-dynamic"

type DashboardPosition = {
  id: string
  poolAddress: string
  poolName: string
  lowerBinId: number
  upperBinId: number
  depositedValueUsd: number
  feesEarnedUsd: number
  openedAt: string
  status: string
  txSignatureOpen: string
}

const NGROK_HEADERS: Record<string, string> = API_BASE.includes("ngrok")
  ? { "ngrok-skip-browser-warning": "true" }
  : {}

async function fetchPrivate<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
  })
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  return res.json() as Promise<T>
}

export default function DashboardPage() {
  const { connected } = useWallet()
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AgentStatus | null>(null)
  const [kpi, setKpi] = useState<KpiSummary | null>(null)
  const [risk, setRisk] = useState<RiskUtilization | null>(null)
  const [safety, setSafety] = useState<SafetyConfig | null>(null)
  const [agentState, setAgentState] = useState<AgentState | null>(null)
  const [positions, setPositions] = useState<DashboardPosition[]>([])

  useEffect(() => {
    const syncAuth = () => setAuthed(isAuthenticated())
    syncAuth()
    window.addEventListener("meteora-auth-changed", syncAuth)
    window.addEventListener("storage", syncAuth)
    return () => {
      window.removeEventListener("meteora-auth-changed", syncAuth)
      window.removeEventListener("storage", syncAuth)
    }
  }, [])

  useEffect(() => {
    if (!connected || !authed) {
      setLoading(false)
      return
    }
    const token = getToken()
    if (!token) {
      setLoading(false)
      setError("Auth token missing")
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchPrivate<AgentStatus>("/status", token),
      fetchPrivate<KpiSummary>("/kpi", token),
      fetchPrivate<RiskUtilization>("/risk", token),
      fetchPrivate<SafetyConfig>("/safety", token),
      fetchPrivate<AgentState>("/agent/state", token),
      fetchPrivate<DashboardPosition[]>("/positions?limit=50", token),
    ])
      .then(([st, kp, rk, sf, ag, pos]) => {
        if (cancelled) return
        setStatus(st)
        setKpi(kp)
        setRisk(rk)
        setSafety(sf)
        setAgentState(ag)
        setPositions(pos)
      })
      .catch(() => {
        if (!cancelled) setError("AUTH REQUIRED")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [connected, authed])

  const fetchedAt = useMemo(
    () =>
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [status?.walletPubkey, kpi?.openPositions, positions.length],
  )

  const livePositions = useMemo(
    () => positions.filter((p) => p.status === "open"),
    [positions],
  )

  if (!connected || !authed) {
    return (
      <div className="min-h-[100dvh] pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="font-mono text-sm border px-4 py-6" style={{ borderColor: "#222", color: "#888" }}>
          CONNECT WALLET + SIGN AUTH MESSAGE TO ACCESS DASHBOARD
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="font-mono text-sm border px-4 py-6" style={{ borderColor: "#222", color: "#888" }}>
          LOADING DASHBOARD…
        </div>
      </div>
    )
  }

  if (error || !status || !kpi || !risk || !safety || !agentState) {
    return (
      <div className="min-h-[100dvh] pt-24 pb-16 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="font-mono text-sm border px-4 py-6" style={{ borderColor: "#222", color: "#ef4444" }}>
          {error ?? "FAILED TO LOAD DASHBOARD"}
        </div>
      </div>
    )
  }

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

  return (
    <div className="crt-scanlines min-h-[100dvh] pt-24 pb-16 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="mb-8" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "16px" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-mono font-black leading-none mb-1"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "#eaeaea", textTransform: "uppercase" }}
            >
              METEORA AGENT
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              LIVE POSITIONS  //  TELEMETRY  //  EXECUTION LOG
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="ops-badge">OPS CONSOLE</span>
              <RefreshButton />
              <SettingsModal status={status} risk={risk} agentState={agentState} safety={safety} />
            </div>
            <div className="font-mono flex items-center gap-2" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#333" }}>
              <span className="inline-block w-1.5 h-1.5" style={{ background: "#14f195", boxShadow: "0 0 4px #14f195" }} />
              UPDATED {fetchedAt}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2" style={{ gap: "1px", background: "#1e1e1e" }}>
        <div style={{ background: "#0A0A0A" }}>
          <StatusRow status={status} />
          <div style={{ borderTop: "1px solid #1e1e1e" }}>
            <VaultPanel />
          </div>
        </div>

        <div style={{ background: "#0A0A0A" }}>
          <CollapsibleSection label="[ METRICS ]" badge={`${kpi.openPositions} LIVE`} defaultOpen={true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" style={{ gap: "1px", background: "#1e1e1e" }}>
              <KpiCard label="Open Positions" value={String(kpi.openPositions)} sub={`max ${safety.maxOpenPositions} open`} accent index={0} />
              <KpiCard label="Daily Fees" value={fmt(kpi.dailyFeesUsd)} sub="fees collected today" index={1} />
              <KpiCard label="Total Deployed" value={fmt(kpi.totalDeployedUsd)} sub={`limit ${fmt(kpi.maxTotalDeployedUsd)}`} index={2} />
              <KpiCard label="PnL Today" value={fmtPnl(kpi.pnlDayUsd)} sub={`week: ${fmtPnl(kpi.pnlWeekUsd)}`} accent={kpi.pnlDayUsd >= 0} index={3} delta={pnlDelta} deltaPositive={pnlDeltaPositive} />
            </div>
          </CollapsibleSection>

          <div style={{ borderTop: "1px solid #1e1e1e" }}>
            <CollapsibleSection label="[ METEORA LIVE POSITIONS ]" badge={`${livePositions.length} ACTIVE`} defaultOpen={true}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px] font-mono" style={{ fontSize: "10px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #141414" }}>
                      {["POOL", "RANGE", "DEPLOYED", "FEES", "STATUS", "OPENED", "TXN"].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-2 text-left"
                          style={{ color: "#333", letterSpacing: "0.12em", fontWeight: 500, background: "#0d0d0d" }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {livePositions.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #111" }}>
                        <td className="px-4 py-2" style={{ color: "#eaeaea" }}>{p.poolName}</td>
                        <td className="px-4 py-2" style={{ color: "#888" }}>{p.lowerBinId}..{p.upperBinId}</td>
                        <td className="px-4 py-2" style={{ color: "#aaa" }}>${p.depositedValueUsd.toFixed(2)}</td>
                        <td className="px-4 py-2" style={{ color: "#aaa" }}>${p.feesEarnedUsd.toFixed(2)}</td>
                        <td className="px-4 py-2" style={{ color: p.status === "open" ? "#14f195" : "#666" }}>{p.status.toUpperCase()}</td>
                        <td className="px-4 py-2" style={{ color: "#666" }}>{new Date(p.openedAt).toLocaleString()}</td>
                        <td className="px-4 py-2" style={{ color: "#888" }}>
                          <a
                            href={`https://explorer.solana.com/tx/${p.txSignatureOpen}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#e61919", textDecoration: "none", letterSpacing: "0.08em" }}
                          >
                            {p.txSignatureOpen.slice(0, 10)}…
                          </a>
                        </td>
                      </tr>
                    ))}
                    {livePositions.length === 0 && (
                      <tr style={{ borderBottom: "1px solid #111" }}>
                        <td className="px-4 py-4" colSpan={7} style={{ color: "#666", letterSpacing: "0.08em" }}>
                          NO LIVE POSITIONS
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          </div>

          <div style={{ borderTop: "1px solid #1e1e1e", background: "#0A0A0A" }}>
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  )
}
