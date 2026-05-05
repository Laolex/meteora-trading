"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { getMarketSnapshot } from "@/lib/api"

interface SnapshotState {
  solPriceUsd: number | null
  ongoingTrades: number | null
}

export default function FootnoteTicker() {
  const [snapshot, setSnapshot] = useState<SnapshotState>({ solPriceUsd: null, ongoingTrades: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getMarketSnapshot()
        if (!cancelled) {
          setSnapshot({ solPriceUsd: data.solPriceUsd, ongoingTrades: data.ongoingTrades })
        }
      } catch (error) {
        console.error("Failed to refresh footnote market snapshot", error)
        if (!cancelled) {
          setSnapshot({ solPriceUsd: null, ongoingTrades: null })
        }
      }
    }

    load()
    const timer = window.setInterval(load, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const solPrice =
    snapshot.solPriceUsd === null
      ? "—"
      : snapshot.solPriceUsd.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })

  const ongoingTrades = snapshot.ongoingTrades === null ? "—" : String(snapshot.ongoingTrades)

  return (
    <div className="fixed bottom-4 right-4 z-40 rounded-xl border border-[#2d3641] bg-[rgba(23,28,35,0.72)] px-3 py-2 backdrop-blur-md">
      <div className="flex items-center gap-3 text-[11px] tracking-wide" style={{ color: "#8a8a8a" }}>
        <span className="flex items-center gap-1.5">
          <motion.span
            className="inline-block h-1.5 w-1.5 rounded-full bg-[#14f195]"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          SOL <span style={{ color: "#f5f5f5" }}>${solPrice}</span>
        </span>
        <span style={{ color: "#333333" }}>•</span>
        <span>
          Trades ongoing <span style={{ color: "#f5f5f5" }}>{ongoingTrades}</span>
        </span>
      </div>
    </div>
  )
}
