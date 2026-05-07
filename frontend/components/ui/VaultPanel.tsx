"use client"

import { useEffect, useState } from "react"
import { getVaultState, type VaultState } from "@/lib/api"
import { isAuthenticated, vaultManagerWithdraw, vaultManagerReturn } from "@/lib/auth"
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

interface ActionFormProps {
  label: string
  buttonText: string
  onSubmit: (amount: number) => Promise<{ ok: boolean; signature: string }>
}

function ActionForm({ label, buttonText, onSubmit }: ActionFormProps) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [successSig, setSuccessSig] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true)
    setSuccessSig(null)
    setErrorMsg(null)
    try {
      const res = await onSubmit(parsed)
      setSuccessSig(res.signature)
      setAmount("")
      setTimeout(() => setSuccessSig(null), 10000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 10000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[#8b95a3]">{label}</span>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 items-center">
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="USDC amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          className="bg-[#111] border border-[#333] text-[#f5f5f5] text-xs rounded px-2 py-1 w-full"
        />
        <button
          type="submit"
          disabled={loading || !amount}
          className="text-xs font-medium px-3 py-1.5 rounded border transition-colors whitespace-nowrap disabled:opacity-50"
          style={{
            borderColor: "#14f195",
            color: "#14f195",
            background: "transparent",
          }}
        >
          {loading ? "…" : buttonText}
        </button>
      </form>
      {successSig && (
        <a
          href={`https://explorer.solana.com/tx/${successSig}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs truncate"
          style={{ color: "#14f195" }}
        >
          ✓ {successSig.slice(0, 8)}…{successSig.slice(-8)}
        </a>
      )}
      {errorMsg && (
        <span className="text-xs truncate" style={{ color: "#ef4444" }}>
          {errorMsg}
        </span>
      )}
    </div>
  )
}

export default function VaultPanel() {
  const [state, setState] = useState<VaultState | null>(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    getVaultState()
      .then(setState)
      .catch(() => setState({ initialized: false, error: "Failed to fetch vault state" }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setAuthed(isAuthenticated())
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

      {!loading && state?.initialized && authed && (
        <div className="flex flex-col gap-3 pt-2 border-t border-[#222]">
          <ActionForm
            label="Withdraw to trade"
            buttonText="Withdraw to Trade"
            onSubmit={vaultManagerWithdraw}
          />
          <ActionForm
            label="Return to vault"
            buttonText="Return to Vault"
            onSubmit={vaultManagerReturn}
          />
        </div>
      )}
    </Card>
  )
}
