"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { useWallet } from "@solana/wallet-adapter-react"
import { viewportOnce, ease } from "@/lib/motion"
import type { ActivityItem } from "@/lib/api"
import { fetchProtectedActivity, isAuthenticated } from "@/lib/auth"

const ACTION_COLOR: Record<string, string> = {
  open: "#14f195",
  close: "#555",
  rebalance: "#60a5fa",
  claim: "#f59e0b",
  exit: "#e61919",
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC"
}

function ResultToken({ success }: { success: boolean | null }) {
  if (success === true)  return <span style={{ color: "#14f195", letterSpacing: "0.08em" }}>[ OK ]</span>
  if (success === false) return <span style={{ color: "#e61919", letterSpacing: "0.08em" }}>[ FAIL ]</span>
  return <span style={{ color: "#444", letterSpacing: "0.08em" }}>[ ··· ]</span>
}

export default function ActivityFeed({ items = [] }: { items?: ActivityItem[] }) {
  const { connected } = useWallet()
  const [collapsed, setCollapsed] = useState(true)
  const [records, setRecords] = useState<ActivityItem[]>(items)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)

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

  const canView = connected && authed

  useEffect(() => {
    if (collapsed || !canView) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchProtectedActivity(20)
      .then((next) => {
        if (!cancelled) setRecords(next)
      })
      .catch(() => {
        if (!cancelled) {
          setRecords([])
          setError("AUTH REQUIRED")
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [collapsed, canView])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, ease }}
      style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: collapsed ? "none" : "1px solid #1a1a1a", background: "transparent", cursor: "pointer" }}
      >
        <span className="term-label">[ RECENT ACTIVITY ]</span>
        <div className="flex items-center gap-2">
          <span className="font-mono" style={{ fontSize: "9px", color: "#333", letterSpacing: "0.08em" }}>
            {canView ? `${records.length} RECORDS` : "LOCKED"}
          </span>
          <span className="font-mono" style={{ fontSize: "9px", color: "#333" }}>{collapsed ? "+" : "−"}</span>
        </div>
      </button>

      {/* Table */}
      {!collapsed && !canView && (
        <div className="px-4 py-5 font-mono" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "#666" }}>
          CONNECT AUTHORIZED WALLET TO VIEW LIVE ACTIVITY
        </div>
      )}
      {!collapsed && canView && <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] font-mono" style={{ fontSize: "10px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #141414" }}>
              {[
                { label: "TIME_UTC", w: "130px" },
                { label: "POOL", w: "90px" },
                { label: "ACTION", w: "80px" },
                { label: "REASON", w: "auto" },
                { label: "RESULT", w: "70px" },
                { label: "TX", w: "80px" },
              ].map(({ label, w }) => (
                <th
                  key={label}
                  className="px-4 py-2 text-left"
                  style={{ color: "#333", letterSpacing: "0.12em", fontWeight: 500, width: w, background: "#0d0d0d" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr style={{ borderBottom: "1px solid #111" }}>
                <td className="px-4 py-3" colSpan={6} style={{ color: "#666", letterSpacing: "0.08em" }}>
                  LOADING ACTIVITY…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr style={{ borderBottom: "1px solid #111" }}>
                <td className="px-4 py-3" colSpan={6} style={{ color: "#e61919", letterSpacing: "0.08em" }}>
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && records.map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={viewportOnce}
                transition={{ duration: 0.25, delay: i * 0.03, ease }}
                style={{ borderBottom: "1px solid #111" }}
              >
                <td className="px-4 py-2" style={{ color: "#555", whiteSpace: "nowrap" }}>
                  {fmtTime(item.decidedAt)}
                </td>
                <td className="px-4 py-2" style={{ color: "#eaeaea", whiteSpace: "nowrap" }}>
                  {item.poolName}
                </td>
                <td className="px-4 py-2" style={{ color: ACTION_COLOR[item.actionType] ?? "#555", whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                  {item.actionType.toUpperCase()}
                </td>
                <td className="px-4 py-2" style={{ color: "#666", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.reason}
                </td>
                <td className="px-4 py-2">
                  <ResultToken success={item.success} />
                </td>
                <td className="px-4 py-2" style={{ color: "#333" }}>
                  {item.txSignature
                    ? (
                      <a
                        href={`https://explorer.solana.com/tx/${item.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#14f195", textDecoration: "none" }}
                      >
                        {item.txSignature.slice(0, 8)}…
                      </a>
                    )
                    : <span>—</span>
                  }
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>}
    </motion.div>
  )
}
