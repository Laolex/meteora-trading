"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { getVaultState, type VaultState } from "@/lib/api"
import { isAuthenticated, vaultManagerWithdraw, vaultManagerReturn } from "@/lib/auth"
import Card from "./Card"

const SPRING = { type: "spring" as const, stiffness: 400, damping: 17 }

function fmt(n: number, decimals = 2) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

interface ActionFormProps {
  label: string
  buttonText: string
  allAmount: number
  onSubmit: (amount: number) => Promise<{ ok: boolean; signature: string }>
}

function ActionForm({ label, buttonText, allAmount, onSubmit }: ActionFormProps) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [successSig, setSuccessSig] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const presets = [25, 50, 100] as const

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
    <div className="flex flex-col gap-2">
      <span className="text-xs text-[#8b95a3]">{label}</span>
      <div className="flex flex-wrap gap-1.5 items-center">
        {presets.map((p) => (
          <motion.button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => setAmount(String(p))}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            transition={SPRING}
            className="text-xs px-2.5 py-1 rounded border font-mono disabled:opacity-50"
            style={{
              borderColor: amount === String(p) ? "#14f195" : "#333",
              color: amount === String(p) ? "#14f195" : "#888",
              background: amount === String(p) ? "rgba(20,241,149,0.08)" : "transparent",
            }}
          >
            {p}
          </motion.button>
        ))}
        <motion.button
          type="button"
          disabled={loading}
          onClick={() => setAmount(allAmount > 0 ? allAmount.toFixed(2) : "")}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="text-xs px-2.5 py-1 rounded border font-mono disabled:opacity-50"
          style={{
            borderColor: "#333",
            color: "#888",
            background: "transparent",
          }}
        >
          All
        </motion.button>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="USDC"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
          className="bg-[#111] border border-[#333] text-[#f5f5f5] text-xs rounded px-2 py-1 flex-1 min-w-[80px]"
        />
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex justify-end">
        <motion.button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) <= 0}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          className="text-xs font-medium px-3 py-1.5 rounded border transition-colors whitespace-nowrap disabled:opacity-50"
          style={{
            borderColor: "#14f195",
            color: "#14f195",
            background: "transparent",
          }}
        >
          {loading ? "…" : buttonText}
        </motion.button>
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
  const [tab, setTab] = useState<"manager" | "investor">("investor")

  useEffect(() => {
    getVaultState()
      .then(setState)
      .catch(() => setState({ initialized: false, error: "Failed to fetch vault state" }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const a = isAuthenticated()
    setAuthed(a)
    if (a) setTab("manager")
  }, [])

  // Capital flow calculations
  const deployedUsd = state?.managerWithdrawn
    ? Number(state.managerWithdrawn) / 1_000_000
    : 0
  const idleUsd = (state?.totalAumUsd ?? 0) - deployedUsd
  const capUsd = state?.depositCapUsd ?? 1
  const deployedPct = Math.min(100, (deployedUsd / capUsd) * 100)
  const idlePct = Math.min(100 - deployedPct, (idleUsd / capUsd) * 100)

  return (
    <Card className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e8edf3]">On-Chain Vault</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5"
          style={{
            background: state?.initialized ? "rgba(20,241,149,0.12)" : "rgba(139,149,163,0.12)",
            color: state?.initialized ? "#14f195" : "#8b95a3",
          }}
        >
          {state?.initialized && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "#14f195" }}
            />
          )}
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
        <>
          {/* Big-number AUM hero */}
          <div className="flex flex-col items-center py-2">
            <span className="text-2xl font-bold tracking-tight" style={{ color: "#f5f5f5" }}>
              {fmt(state.totalAumUsd ?? 0)}
            </span>
            <span className="text-[11px] mt-0.5" style={{ color: "#888888" }}>
              Total AUM
            </span>
          </div>

          {/* Capital-flow segmented bar */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2 rounded-full overflow-hidden flex w-full" style={{ background: "rgba(255,255,255,0.05)" }}>
              {deployedPct > 0 && (
                <div
                  className="h-full rounded-l-full transition-all duration-500"
                  style={{
                    width: `${deployedPct}%`,
                    background: "rgba(20,241,149,0.8)",
                  }}
                />
              )}
              {idlePct > 0 && (
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${idlePct}%`,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: deployedPct <= 0 ? "9999px" : "0 9999px 9999px 0",
                  }}
                />
              )}
            </div>
            <div className="flex gap-4 text-[11px]" style={{ color: "#888888" }}>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "rgba(20,241,149,0.8)" }} />
                Deployed&nbsp;
                <span style={{ color: "#c8d0d9" }}>{fmt(deployedUsd)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: "rgba(255,255,255,0.15)" }} />
                Idle&nbsp;
                <span style={{ color: "#c8d0d9" }}>{fmt(Math.max(0, idleUsd))}</span>
              </span>
            </div>
          </div>

          {/* Small stat rows */}
          <div className="flex flex-col gap-0">
            <div className="flex justify-between items-baseline py-1.5 border-b border-white/5">
              <span className="text-xs text-[#8b95a3]">NAV / share</span>
              <span className="text-xs font-mono text-[#c8d0d9]">{fmt(state.navPerShareUsd ?? 1, 6)}</span>
            </div>
            <div className="flex justify-between items-baseline py-1.5">
              <span className="text-xs text-[#8b95a3]">Deposit cap</span>
              <span className="text-xs font-mono text-[#c8d0d9]">{fmt(state.depositCapUsd ?? 0, 0)}</span>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[#222]">
            {authed && (
              <motion.button
                onClick={() => setTab("manager")}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={SPRING}
                className="text-xs font-medium px-4 py-2 relative"
                style={{ color: tab === "manager" ? "#f5f5f5" : "#888888" }}
              >
                Manager
                {tab === "manager" && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "#14f195" }}
                  />
                )}
              </motion.button>
            )}
            <motion.button
              onClick={() => setTab("investor")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING}
              className="text-xs font-medium px-4 py-2 relative"
              style={{ color: tab === "investor" ? "#f5f5f5" : "#888888" }}
            >
              Investor
              {tab === "investor" && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#14f195" }}
                />
              )}
            </motion.button>
          </div>

          {/* Manager tab */}
          {tab === "manager" && authed && (
            <div className="flex flex-col gap-4">
              <ActionForm
                label="Withdraw to Trade"
                buttonText="Withdraw to Trade"
                allAmount={Math.max(0, idleUsd)}
                onSubmit={vaultManagerWithdraw}
              />
              <ActionForm
                label="Return to Vault"
                buttonText="Return to Vault"
                allAmount={deployedUsd}
                onSubmit={vaultManagerReturn}
              />
            </div>
          )}

          {/* Investor tab */}
          {tab === "investor" && (
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#8b95a3]">Your shares</span>
                <span className="text-xs font-mono text-[#c8d0d9]">—</span>
              </div>
              <p className="text-xs text-[#555]">
                Investor deposit/withdraw coming in next update.
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
