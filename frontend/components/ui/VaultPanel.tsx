"use client"

import { useEffect, useState } from "react"
import { getVaultState, type VaultState } from "@/lib/api"
import Card from "./Card"

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-[#8b95a3]">{label}</span>
      <span className="text-xs font-mono text-[#c8d0d9]">{value}</span>
    </div>
  )
}

function fmt(n: number, decimals = 2) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

function shortKey(k: string) {
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

export default function VaultPanel() {
  const [state, setState] = useState<VaultState | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVaultState()
      .then(setState)
      .catch(() => setState({ initialized: false, error: "Failed to fetch vault state" }))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e8edf3]">On-Chain Vault</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono"
          style={{
            background: state?.initialized ? "rgba(20,241,149,0.12)" : "rgba(139,149,163,0.12)",
            color: state?.initialized ? "#14f195" : "#8b95a3",
          }}
        >
          {loading ? "…" : state?.initialized ? "live" : "not deployed"}
        </span>
      </div>

      {loading && (
        <p className="text-xs text-[#8b95a3] animate-pulse">Loading vault state…</p>
      )}

      {!loading && !state?.initialized && (
        <p className="text-xs text-[#8b95a3]">
          {state?.error ?? "Vault not yet initialized on-chain."}
        </p>
      )}

      {!loading && state?.initialized && (
        <div className="flex flex-col">
          <StatRow label="Total AUM" value={fmt(state.totalAumUsd ?? 0)} />
          <StatRow label="NAV / share" value={fmt(state.navPerShareUsd ?? 1, 6)} />
          <StatRow label="Deposit cap" value={fmt(state.depositCapUsd ?? 0, 0)} />
          <StatRow
            label="Manager deployed"
            value={
              state.managerWithdrawn && state.managerWithdrawn !== "0"
                ? `${(Number(state.managerWithdrawn) / 1_000_000).toFixed(2)} USDC`
                : "none"
            }
          />
          <StatRow label="Vault" value={shortKey(state.vault ?? "")} />
          <StatRow label="Share mint" value={shortKey(state.shareMint ?? "")} />
        </div>
      )}
    </Card>
  )
}
