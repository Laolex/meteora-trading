"use client"

import { useEffect, useState } from "react"
import { getMarketSnapshot } from "@/lib/api"

interface SnapshotState {
  solPriceUsd: number | null
  metPriceUsd: number | null
  ongoingTrades: number | null
}

export default function FootnoteTicker() {
  const [snapshot, setSnapshot] = useState<SnapshotState>({ solPriceUsd: null, metPriceUsd: null, ongoingTrades: null })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getMarketSnapshot()
        if (!cancelled) {
          setSnapshot({ solPriceUsd: data.solPriceUsd, metPriceUsd: data.metPriceUsd, ongoingTrades: data.ongoingTrades })
          setLastUpdatedAt(Date.now())
        }
      } catch {
        if (!cancelled) setSnapshot({ solPriceUsd: null, metPriceUsd: null, ongoingTrades: null })
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 30000)
    const clock = window.setInterval(() => { if (!cancelled) setNow(Date.now()) }, 1000)
    return () => { cancelled = true; window.clearInterval(timer); window.clearInterval(clock) }
  }, [])

  const fmt = (n: number | null, decimals = 2) =>
    n === null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  const updatedLabel = lastUpdatedAt === null ? "—" : `${Math.max(0, Math.floor((now - lastUpdatedAt) / 1000))}s`

  return (
    <div
      className="fixed bottom-4 right-4 z-40 font-mono"
      style={{
        background: "#0d0d0d",
        border: "1px solid #1e1e1e",
        borderLeft: "3px solid #14f195",
        padding: "8px 14px",
        minWidth: "300px",
      }}
    >
      {/* Status bar line */}
      <div className="flex items-center gap-0 flex-wrap" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#555" }}>
        {/* Live indicator */}
        <span style={{ color: "#14f195", marginRight: "10px" }}>●</span>

        {/* SOL */}
        <span style={{ marginRight: "16px", textTransform: "uppercase" }}>
          SOL <span style={{ color: "#eaeaea" }}>${fmt(snapshot.solPriceUsd)}</span>
        </span>

        {/* MET */}
        <span style={{ marginRight: "16px", textTransform: "uppercase" }}>
          MET <span style={{ color: "#eaeaea" }}>${fmt(snapshot.metPriceUsd, 4)}</span>
        </span>

        {/* Trades */}
        <span style={{ marginRight: "16px", textTransform: "uppercase" }}>
          ACTIVE <span style={{ color: "#eaeaea" }}>{snapshot.ongoingTrades ?? "—"}</span>
        </span>

        {/* Timestamp */}
        <span style={{ color: "#333", textTransform: "uppercase", marginLeft: "auto" }}>
          +{updatedLabel}
        </span>
      </div>
    </div>
  )
}
