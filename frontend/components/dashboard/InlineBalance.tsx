"use client"

import { useEffect, useState } from "react"
import { getWalletBalance } from "@/lib/api"

export default function InlineBalance({ compact }: { compact?: boolean }) {
  const [sol, setSol] = useState<number | null>(null)
  const [usdc, setUsdc] = useState<number | null>(null)

  useEffect(() => {
    getWalletBalance()
      .then(b => { setSol(b.solBalance); setUsdc(b.usdcBalance) })
      .catch(() => {})
  }, [])

  if (compact) {
    return (
      <>
        <span style={{ color: "#555" }}>
          SOL <span style={{ color: "#aaa" }}>{sol !== null ? sol.toFixed(3) : "—"}</span>
        </span>
        <span style={{ marginLeft: "12px", color: "#555" }}>
          USDC <span style={{ color: "#aaa" }}>{usdc !== null ? usdc.toFixed(0) : "—"}</span>
        </span>
      </>
    )
  }

  return (
    <>
      <span style={{ marginRight: "16px", color: "#555" }}>
        SOL <span style={{ color: "#aaa" }}>{sol !== null ? sol.toFixed(3) : "—"}</span>
      </span>
      <span style={{ marginRight: "16px", color: "#555" }}>
        USDC <span style={{ color: "#aaa" }}>{usdc !== null ? usdc.toFixed(0) : "—"}</span>
      </span>
    </>
  )
}
