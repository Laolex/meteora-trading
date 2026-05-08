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

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1e1e1e",
  color: "#eaeaea",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "5px 8px",
  width: "100%",
  outline: "none",
  letterSpacing: "0.04em",
}

function TermBtn({ onClick, disabled, children, variant = "neutral" }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: "green" | "neutral" | "red"
}) {
  const color = variant === "green" ? "#14f195" : variant === "red" ? "#e61919" : "#555"
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono transition-colors disabled:opacity-40"
      style={{
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        padding: "5px 10px",
        border: `1px solid ${color}`,
        color,
        background: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        flex: 1,
      }}
    >
      {children}
    </button>
  )
}

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
  const [authed, setAuthed] = useState(false)

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
    const t = setTimeout(() => { void fetchBalance() }, 0)
    const id = setInterval(() => void fetchBalance(), POLL_INTERVAL_MS)
    return () => { clearTimeout(t); clearInterval(id) }
  }, [fetchBalance])

  useEffect(() => { setAuthed(isAuthenticated()) }, [])

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
        tx.add(SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: agentPubkey,
          lamports: Math.floor(amount * LAMPORTS_PER_SOL),
        }))
      } else {
        const mint = new PublicKey(balance.usdcMint)
        const sourceAta = await getAssociatedTokenAddress(mint, publicKey)
        const destAta = await getAssociatedTokenAddress(mint, agentPubkey)
        try { await getAccount(connection, destAta) } catch {
          tx.add(createAssociatedTokenAccountInstruction(publicKey, destAta, agentPubkey, mint))
        }
        tx.add(createTransferInstruction(sourceAta, destAta, publicKey,
          Math.floor(amount * 10 ** USDC_DECIMALS), [], TOKEN_PROGRAM_ID))
      }

      const sig = await sendTransaction(tx, connection)
      setSuccessMsg(`TX: ${sig.slice(0, 8)}…`)
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
      setSuccessMsg(`TX: ${result.txSignature.slice(0, 8)}…`)
      setUiState("success")
      setShowWithdraw(false)
      setWithdrawSol(""); setWithdrawUsdc("")
      void fetchBalance()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Withdraw failed")
      setUiState("error")
    }
  }

  const busy = uiState === "funding" || uiState === "withdrawing"

  return (
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ HOT WALLET ]</span>
        <div className="flex items-center gap-3">
          {stale && <span className="font-mono" style={{ fontSize: "8px", color: "#e61919", letterSpacing: "0.08em" }}>STALE</span>}
          <button onClick={() => void fetchBalance()} className="font-mono" style={{ fontSize: "10px", color: "#333" }} title="Refresh">↻</button>
        </div>
      </div>

      {/* Address */}
      {balance && (
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid #111" }}>
          <span className="font-mono" style={{ fontSize: "9px", color: "#333", letterSpacing: "0.04em" }}>
            {balance.address.slice(0, 6)}…{balance.address.slice(-4)}
          </span>
          <button onClick={copyAddress} className="font-mono" style={{ fontSize: "9px", color: copied ? "#14f195" : "#333" }}>
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
      )}

      {/* Balances */}
      <div className="px-4 py-3">
        <div className="flex justify-between items-baseline py-1.5" style={{ borderBottom: "1px solid #111" }}>
          <span className="font-mono" style={{ fontSize: "9px", color: "#333", letterSpacing: "0.1em" }}>SOL</span>
          <span className="font-mono" style={{ fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em", fontWeight: 700 }}>
            {balance?.solBalance.toFixed(4) ?? "—"}
          </span>
        </div>
        <div className="flex justify-between items-baseline py-1.5">
          <span className="font-mono" style={{ fontSize: "9px", color: "#333", letterSpacing: "0.1em" }}>USDC</span>
          <span className="font-mono" style={{ fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em", fontWeight: 700 }}>
            {balance?.usdcBalance.toFixed(2) ?? "—"}
          </span>
        </div>
      </div>

      {/* Actions */}
      {authed && (
        <div className="px-4 pb-3 flex gap-2">
          <TermBtn onClick={() => { setShowFund(!showFund); setShowWithdraw(false) }} disabled={busy} variant="green">
            FUND
          </TermBtn>
          <TermBtn onClick={() => { setShowWithdraw(!showWithdraw); setShowFund(false) }} disabled={busy}>
            WITHDRAW
          </TermBtn>
        </div>
      )}

      {/* Fund form */}
      {showFund && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #111" }}>
          <div className="flex gap-1 mt-3 mb-2">
            {(["sol", "usdc"] as FundMode[]).map(m => (
              <button
                key={m}
                onClick={() => setFundMode(m)}
                className="font-mono"
                style={{
                  fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase",
                  padding: "3px 8px",
                  border: `1px solid ${fundMode === m ? "#14f195" : "#1e1e1e"}`,
                  color: fundMode === m ? "#14f195" : "#444",
                  background: "transparent", cursor: "pointer",
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <input type="number" min="0" step="0.01" placeholder={`Amount ${fundMode.toUpperCase()}`}
            value={fundAmount} onChange={e => setFundAmount(e.target.value)} style={inputStyle}
          />
          <button
            onClick={() => void handleFund()}
            disabled={busy || !fundAmount || !publicKey}
            className="w-full font-mono mt-2 transition-colors disabled:opacity-40"
            style={{ fontSize: "9px", letterSpacing: "0.1em", padding: "6px", border: "1px solid #14f195", color: "#14f195", background: "transparent", cursor: "pointer" }}
          >
            {uiState === "funding" ? "···" : `[ SEND ${fundMode.toUpperCase()} ]`}
          </button>
        </div>
      )}

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid #111" }}>
          <div className="mt-3 space-y-2">
            <input type="number" min="0" step="0.001" placeholder="SOL (0 to skip)"
              value={withdrawSol} onChange={e => setWithdrawSol(e.target.value)} style={inputStyle}
            />
            <input type="number" min="0" step="0.01" placeholder="USDC (0 to skip)"
              value={withdrawUsdc} onChange={e => setWithdrawUsdc(e.target.value)} style={inputStyle}
            />
            <button
              onClick={() => void handleWithdraw()}
              disabled={busy}
              className="w-full font-mono transition-colors disabled:opacity-40"
              style={{ fontSize: "9px", letterSpacing: "0.1em", padding: "6px", border: "1px solid #555", color: "#555", background: "transparent", cursor: "pointer" }}
            >
              {uiState === "withdrawing" ? "···" : "[ WITHDRAW TO WALLET ]"}
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {uiState === "success" && (
        <p className="px-4 pb-3 font-mono" style={{ fontSize: "9px", color: "#14f195", letterSpacing: "0.06em" }}>{successMsg}</p>
      )}
      {uiState === "error" && (
        <p className="px-4 pb-3 font-mono" style={{ fontSize: "9px", color: "#e61919", letterSpacing: "0.04em" }}>ERR: {errorMsg}</p>
      )}
    </div>
  )
}
