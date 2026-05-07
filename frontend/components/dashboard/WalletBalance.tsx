"use client"

import { useEffect, useState, useCallback } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import { getWalletBalance, type WalletBalance } from "@/lib/api"
import { isAuthenticated, adminWithdraw } from "@/lib/auth"

const USDC_DECIMALS = 6
const POLL_INTERVAL_MS = 30_000

type FundMode = "sol" | "usdc"
type UIState = "idle" | "funding" | "withdrawing" | "success" | "error"

export default function WalletBalancePanel() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()

  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [stale, setStale] = useState(false)
  const [copied, setCopied] = useState(false)

  const [uiState, setUiState] = useState<UIState>("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")

  const [fundMode, setFundMode] = useState<FundMode>("sol")
  const [fundAmount, setFundAmount] = useState("")
  const [withdrawSol, setWithdrawSol] = useState("")
  const [withdrawUsdc, setWithdrawUsdc] = useState("")
  const [showFund, setShowFund] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  const fetchBalance = useCallback(async () => {
    try {
      const data = await getWalletBalance()
      setBalance(data)
      setStale(false)
    } catch {
      setStale(true)
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(() => {
      void fetchBalance()
    }, 0)
    const id = setInterval(() => void fetchBalance(), POLL_INTERVAL_MS)
    return () => {
      clearTimeout(initial)
      clearInterval(id)
    }
  }, [fetchBalance])

  const authed = isAuthenticated()

  function copyAddress() {
    if (!balance) return
    void navigator.clipboard.writeText(balance.address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleFund() {
    if (!publicKey || !balance || !fundAmount) return
    const amount = parseFloat(fundAmount)
    if (isNaN(amount) || amount <= 0) return

    setUiState("funding")
    setErrorMsg("")
    try {
      const agentPubkey = new PublicKey(balance.address)
      const tx = new Transaction()

      if (fundMode === "sol") {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: agentPubkey,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL),
          })
        )
      } else {
        const mint = new PublicKey(balance.usdcMint)
        const sourceAta = await getAssociatedTokenAddress(mint, publicKey)
        const destAta = await getAssociatedTokenAddress(mint, agentPubkey)

        try {
          await getAccount(connection, destAta)
        } catch {
          tx.add(
            createAssociatedTokenAccountInstruction(
              publicKey, destAta, agentPubkey, mint
            )
          )
        }

        tx.add(
          createTransferInstruction(
            sourceAta,
            destAta,
            publicKey,
            Math.floor(amount * 10 ** USDC_DECIMALS),
            [],
            TOKEN_PROGRAM_ID,
          )
        )
      }

      const sig = await sendTransaction(tx, connection)
      setSuccessMsg(`Funded — tx: ${sig.slice(0, 8)}…`)
      setUiState("success")
      setShowFund(false)
      setFundAmount("")
      void fetchBalance()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Fund failed")
      setUiState("error")
    }
  }

  async function handleWithdraw() {
    const sol = parseFloat(withdrawSol || "0")
    const usdc = parseFloat(withdrawUsdc || "0")
    if (sol <= 0 && usdc <= 0) return

    setUiState("withdrawing")
    setErrorMsg("")
    try {
      const result = await adminWithdraw(sol, usdc)
      setSuccessMsg(`Withdrawn — tx: ${result.txSignature.slice(0, 8)}…`)
      setUiState("success")
      setShowWithdraw(false)
      setWithdrawSol("")
      setWithdrawUsdc("")
      void fetchBalance()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Withdraw failed")
      setUiState("error")
    }
  }

  const busy = uiState === "funding" || uiState === "withdrawing"

  return (
    <div
      className="rounded-2xl p-5 space-y-4 text-sm"
      style={{ border: "1px solid #222222", background: "#0d0d0d" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-medium" style={{ color: "#555555" }}>
          Hot Wallet
        </span>
        <div className="flex items-center gap-2">
          {stale && <span className="text-xs" style={{ color: "#666666" }}>stale</span>}
          <button
            onClick={() => void fetchBalance()}
            className="text-xs transition-colors hover:text-[#14f195]"
            style={{ color: "#444444" }}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {balance && (
        <div className="flex items-center gap-2 font-mono text-xs" style={{ color: "#888888" }}>
          <span>{balance.address.slice(0, 6)}…{balance.address.slice(-4)}</span>
          <button
            onClick={copyAddress}
            className="transition-colors"
            style={{ color: copied ? "#14f195" : "#444444" }}
            title="Copy address"
          >
            {copied ? "✓" : "⎘"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#888888" }}>
            <span style={{ color: "#14f195", fontSize: "15px", lineHeight: 1 }}>◎</span>
            SOL
          </span>
          <span className="font-mono text-sm font-medium" style={{ color: "#f5f5f5" }}>{balance?.solBalance.toFixed(4) ?? "—"}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "#888888" }}>
            <span style={{ color: "#2775ca", fontSize: "13px", lineHeight: 1, fontWeight: 700 }}>$</span>
            USDC
          </span>
          <span className="font-mono text-sm font-medium" style={{ color: "#f5f5f5" }}>{balance?.usdcBalance.toFixed(2) ?? "—"}</span>
        </div>
      </div>

      {authed && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => { setShowFund(!showFund); setShowWithdraw(false) }}
            disabled={busy}
            className="flex-1 py-1 rounded text-xs font-medium transition-colors"
            style={{ background: "#111111", color: "#14f195", border: "1px solid #14f19540" }}
          >
            Fund
          </button>
          <button
            onClick={() => { setShowWithdraw(!showWithdraw); setShowFund(false) }}
            disabled={busy}
            className="flex-1 py-1 rounded text-xs font-medium transition-colors"
            style={{ background: "#111111", color: "#888888", border: "1px solid #333333" }}
          >
            Withdraw
          </button>
        </div>
      )}

      {showFund && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-1">
            {(["sol", "usdc"] as FundMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setFundMode(m)}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{
                  background: fundMode === m ? "#14f19520" : "#111111",
                  color: fundMode === m ? "#14f195" : "#666666",
                  border: `1px solid ${fundMode === m ? "#14f19540" : "#222222"}`,
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={`Amount in ${fundMode.toUpperCase()}`}
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs font-mono bg-transparent outline-none"
            style={{ border: "1px solid #333333", color: "#f5f5f5" }}
          />
          <button
            onClick={() => void handleFund()}
            disabled={busy || !fundAmount || !publicKey}
            className="w-full py-1 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: "#14f19520", color: "#14f195", border: "1px solid #14f19540" }}
          >
            {uiState === "funding" ? "Sending…" : `Send ${fundMode.toUpperCase()} to agent`}
          </button>
        </div>
      )}

      {showWithdraw && (
        <div className="space-y-2 pt-1">
          <input
            type="number"
            min="0"
            step="0.001"
            placeholder="SOL amount (0 to skip)"
            value={withdrawSol}
            onChange={(e) => setWithdrawSol(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs font-mono bg-transparent outline-none"
            style={{ border: "1px solid #333333", color: "#f5f5f5" }}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="USDC amount (0 to skip)"
            value={withdrawUsdc}
            onChange={(e) => setWithdrawUsdc(e.target.value)}
            className="w-full px-2 py-1 rounded text-xs font-mono bg-transparent outline-none"
            style={{ border: "1px solid #333333", color: "#f5f5f5" }}
          />
          <button
            onClick={() => void handleWithdraw()}
            disabled={busy}
            className="w-full py-1 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: "#111111", color: "#888888", border: "1px solid #333333" }}
          >
            {uiState === "withdrawing" ? "Withdrawing…" : "Withdraw to your wallet"}
          </button>
        </div>
      )}

      {uiState === "success" && (
        <p className="text-xs" style={{ color: "#14f195" }}>{successMsg}</p>
      )}
      {uiState === "error" && (
        <p className="text-xs" style={{ color: "#ef4444" }}>{errorMsg}</p>
      )}
    </div>
  )
}
