"use client"

import { useState, useEffect, useMemo } from "react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import {
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token"
import {
  isAuthenticated,
  clearToken,
  verifyWallet,
  adminKillSwitch,
  adminToggleLlm,
  adminUpdateConfig,
  adminSetLlmKey,
  adminWithdraw,
} from "@/lib/auth"
import type { AgentStatus, RiskUtilization, AgentState, SafetyConfig } from "@/lib/api"

interface Props {
  status: AgentStatus
  risk: RiskUtilization
  agentState: AgentState
  safety: SafetyConfig
}

const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
const USDC_MINT_DEVNET  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"

function CollapsibleSection({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: "1px solid #1e1e1e" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2"
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <span className="term-label">{label}</span>
        <span
          className="font-mono"
          style={{ fontSize: "9px", color: "#444", letterSpacing: "0.1em" }}
        >
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && children}
    </div>
  )
}

function TelemetryCell({
  index,
  label,
  prefix,
  suffix,
  value,
  onChange,
  disabled,
  danger = false,
  span = false,
}: {
  index: string
  label: string
  prefix?: string
  suffix?: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  danger?: boolean
  span?: boolean
}) {
  return (
    <div
      style={{
        background: "#080808",
        padding: "12px 14px 14px",
        position: "relative",
        gridColumn: span ? "1 / -1" : undefined,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* index + label */}
      <div className="flex items-center gap-1.5" style={{ marginBottom: "8px" }}>
        <span
          className="font-mono"
          style={{ fontSize: "8px", letterSpacing: "0.08em", color: danger ? "#E61919" : "#2a2a2a" }}
        >
          {index} //
        </span>
        <span
          className="font-mono"
          style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#3a3a3a", textTransform: "uppercase" }}
        >
          {label}
        </span>
      </div>

      {/* value row */}
      <div className="flex items-baseline gap-1">
        {prefix && (
          <span className="font-mono" style={{ fontSize: "11px", color: "#444", lineHeight: 1 }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono"
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "22px",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: danger ? "#E61919" : "#eaeaea",
            padding: 0,
          }}
        />
        {suffix && (
          <span className="font-mono" style={{ fontSize: "13px", color: danger ? "#E6191960" : "#2a2a2a", lineHeight: 1 }}>{suffix}</span>
        )}
      </div>

      {/* danger floor line */}
      {danger && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "#E6191918" }} />
      )}
    </div>
  )
}

function AuthButton({ onAuth }: { onAuth: () => void }) {
  const wallet = useWallet()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSign = async () => {
    if (!wallet.publicKey || !wallet.signMessage) return
    setLoading(true); setErr(null)
    try {
      await verifyWallet(wallet.publicKey.toBase58(), wallet.signMessage)
      onAuth()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed")
      setTimeout(() => setErr(null), 4000)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center gap-2">
      {err && <span className="font-mono" style={{ fontSize: "8px", color: "#e61919", letterSpacing: "0.06em" }}>{err}</span>}
      <button
        onClick={() => void handleSign()}
        disabled={loading}
        className="font-mono disabled:opacity-40"
        style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#14f195", background: "transparent", border: "1px solid #14f19530", padding: "2px 8px", cursor: "pointer" }}
      >
        {loading ? "···" : "[ SIGN IN ]"}
      </button>
    </div>
  )
}

export default function SettingsModal({ status, risk: _risk, agentState, safety }: Props) {
  const [open, setOpen] = useState(false)
  const [authed, setAuthed] = useState(false)
  const { setVisible: openWalletModal } = useWalletModal()
  const wallet = useWallet()

  // Always use the correct network RPC — don't rely on WalletProvider's endpoint
  // which may be devnet by default if NEXT_PUBLIC_SOLANA_RPC_URL isn't set.
  const connection = useMemo(() => new Connection(
    status.network === "mainnet"
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com")
      : "https://api.devnet.solana.com",
    "confirmed"
  ), [status.network])

  // Agent control
  const [armed, setArmed] = useState(status.killSwitchPresent)
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)

  // Risk params
  const [maxPos, setMaxPos] = useState(String(safety.maxPositionUsd))
  const [maxDep, setMaxDep] = useState(String(safety.maxTotalDeployedUsd))
  const [lossLim, setLossLim] = useState(String(safety.dailyLossLimitPct))
  const [maxOpenPos, setMaxOpenPos] = useState(String(safety.maxOpenPositions))
  const [exitVol, setExitVol] = useState(String(agentState.exitVolatilityPct ?? 30))
  const [riskSaving, setRiskSaving] = useState(false)
  const [riskMsg, setRiskMsg] = useState<string | null>(null)

  // LLM
  const [llmEnabled, setLlmEnabled] = useState(agentState.llmEnabled)
  const [llmLoading, setLlmLoading] = useState(false)
  const [llmProvider, setLlmProvider] = useState<"anthropic" | "openai">("anthropic")
  const [llmKey, setLlmKey] = useState("")
  const [llmKeyVisible, setLlmKeyVisible] = useState(false)
  const [llmKeySaving, setLlmKeySaving] = useState(false)
  const [llmMsg, setLlmMsg] = useState<string | null>(null)
  const [keyConfigured, setKeyConfigured] = useState(agentState.anthropicKeyConfigured)

  // Funds
  const [fundsMode, setFundsMode] = useState<"deposit" | "withdraw">("deposit")
  const [depositSol, setDepositSol] = useState("")
  const [depositUsdc, setDepositUsdc] = useState("")
  const [withdrawSol, setWithdrawSol] = useState("")
  const [withdrawUsdc, setWithdrawUsdc] = useState("")
  const [fundsLoading, setFundsLoading] = useState(false)
  const [fundsMsg, setFundsMsg] = useState<string | null>(null)
  const [walletSol, setWalletSol] = useState<number | null>(null)
  const [walletUsdc, setWalletUsdc] = useState<number | null>(null)
  const [depositPct, setDepositPct] = useState(0)

  useEffect(() => { setAuthed(isAuthenticated()) }, [open])

  useEffect(() => {
    if (!open || !wallet.publicKey) return
    const pk = wallet.publicKey
    const usdcMint = new PublicKey(status.network === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET)

    connection.getBalance(pk)
      .then(lamports => setWalletSol(lamports / LAMPORTS_PER_SOL))
      .catch(() => setWalletSol(0))

    getAssociatedTokenAddress(usdcMint, pk)
      .then(ata => connection.getTokenAccountBalance(ata))
      .then(resp => setWalletUsdc(resp.value.uiAmount ?? 0))
      .catch(() => setWalletUsdc(0))
  }, [open, wallet.publicKey, connection, status.network])

  const handleAgentToggle = async () => {
    if (!authed) { setAgentError("OPERATOR AUTH REQUIRED"); return }
    setAgentLoading(true)
    setAgentError(null)
    try {
      const result = await adminKillSwitch(!armed)
      setArmed(result.armed)
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setAgentLoading(false)
    }
  }

  const handleSaveRisk = async () => {
    if (!authed) { setRiskMsg("OPERATOR AUTH REQUIRED"); return }
    const pos = parseFloat(maxPos)
    const dep = parseFloat(maxDep)
    const loss = parseFloat(lossLim)
    const openPos = parseInt(maxOpenPos, 10)
    const vol = parseFloat(exitVol)
    if (isNaN(pos) || isNaN(dep) || isNaN(loss) || isNaN(openPos) || isNaN(vol)) { setRiskMsg("INVALID VALUES"); return }
    if (openPos < 1) { setRiskMsg("MIN 1 POSITION"); return }
    if (vol <= 0 || vol > 100) { setRiskMsg("VOL 1–100%"); return }
    setRiskSaving(true)
    setRiskMsg(null)
    try {
      await adminUpdateConfig({ maxPositionUsd: pos, maxTotalDeployedUsd: dep, dailyLossPct: loss, maxOpenPositions: openPos, exitVolatilityPct: vol })
      setRiskMsg("SAVED")
      setTimeout(() => setRiskMsg(null), 2500)
    } catch (err) {
      setRiskMsg(err instanceof Error ? err.message : "FAILED")
    } finally {
      setRiskSaving(false)
    }
  }

  const handleLlmToggle = async () => {
    if (!authed) { setLlmMsg("OPERATOR AUTH REQUIRED"); return }
    setLlmLoading(true)
    setLlmMsg(null)
    try {
      const result = await adminToggleLlm(!llmEnabled)
      setLlmEnabled(result.enabled)
    } catch (err) {
      setLlmMsg(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLlmLoading(false)
    }
  }

  const handleSaveLlmKey = async () => {
    if (!authed) { setLlmMsg("OPERATOR AUTH REQUIRED"); return }
    if (!llmKey.trim()) { setLlmMsg("KEY REQUIRED"); return }
    setLlmKeySaving(true)
    setLlmMsg(null)
    try {
      await adminSetLlmKey(llmKey.trim(), llmProvider)
      setKeyConfigured(true)
      setLlmKey("")
      setLlmMsg("KEY SAVED")
      setTimeout(() => setLlmMsg(null), 2500)
    } catch (err) {
      setLlmMsg(err instanceof Error ? err.message : "FAILED")
    } finally {
      setLlmKeySaving(false)
    }
  }

  const SLIDER_STEPS = [0, 25, 50, 100]

  const handleSlider = (step: number) => {
    const pct = SLIDER_STEPS[step] ?? 0
    setDepositPct(step)
    if (pct === 0) { setDepositSol(""); setDepositUsdc(""); return }
    if (walletSol !== null) {
      const raw = walletSol * (pct / 100)
      // Reserve 0.005 SOL for fees when taking max
      const safe = pct === 100 ? Math.max(0, raw - 0.005) : raw
      setDepositSol(safe > 0 ? safe.toFixed(4) : "")
    }
    if (walletUsdc !== null) {
      const amt = walletUsdc * (pct / 100)
      setDepositUsdc(amt > 0 ? amt.toFixed(2) : "")
    }
  }

  const handleDeposit = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction) {
      setFundsMsg("CONNECT WALLET FIRST")
      return
    }
    const solAmt = parseFloat(depositSol) || 0
    const usdcAmt = parseFloat(depositUsdc) || 0
    if (solAmt <= 0 && usdcAmt <= 0) { setFundsMsg("ENTER AN AMOUNT"); return }

    setFundsLoading(true)
    setFundsMsg(null)
    try {
      const agentKey = new PublicKey(status.walletPubkey)
      const usdcMint = new PublicKey(
        status.network === "mainnet" ? USDC_MINT_MAINNET : USDC_MINT_DEVNET
      )
      const tx = new Transaction()

      if (solAmt > 0) {
        tx.add(SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: agentKey,
          lamports: Math.round(solAmt * LAMPORTS_PER_SOL),
        }))
      }

      if (usdcAmt > 0) {
        const senderAta = await getAssociatedTokenAddress(usdcMint, wallet.publicKey)
        const receiverAta = await getAssociatedTokenAddress(usdcMint, agentKey)
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            wallet.publicKey,
            receiverAta,
            agentKey,
            usdcMint,
          )
        )
        tx.add(
          createTransferInstruction(
            senderAta,
            receiverAta,
            wallet.publicKey,
            BigInt(Math.round(usdcAmt * 1_000_000)),
          )
        )
      }

      const sig = await wallet.sendTransaction(tx, connection)
      setFundsMsg(`SENT — ${sig.slice(0, 8)}…`)
      setDepositSol("")
      setDepositUsdc("")
    } catch (err) {
      setFundsMsg(err instanceof Error ? err.message.slice(0, 60) : "TX FAILED")
    } finally {
      setFundsLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!authed) { setFundsMsg("OPERATOR AUTH REQUIRED"); return }
    const solAmt = parseFloat(withdrawSol) || 0
    const usdcAmt = parseFloat(withdrawUsdc) || 0
    if (solAmt <= 0 && usdcAmt <= 0) { setFundsMsg("ENTER AN AMOUNT"); return }
    setFundsLoading(true)
    setFundsMsg(null)
    try {
      const result = await adminWithdraw(solAmt, usdcAmt)
      setFundsMsg(`WITHDRAWN — ${result.txSignature.slice(0, 8)}…`)
      setWithdrawSol("")
      setWithdrawUsdc("")
    } catch (err) {
      setFundsMsg(err instanceof Error ? err.message.slice(0, 60) : "FAILED")
    } finally {
      setFundsLoading(false)
    }
  }

  const btnStyle = (color: string) => ({
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    padding: "5px 12px",
    border: `1px solid ${color}`,
    color,
    background: "transparent",
    cursor: "pointer",
    fontFamily: "var(--font-mono), monospace",
    whiteSpace: "nowrap" as const,
  })

  const keyPlaceholder = llmProvider === "anthropic" ? "sk-ant-api03-…" : "sk-proj-…"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="font-mono"
        style={btnStyle("#666")}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#999"; e.currentTarget.style.color = "#999" }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#666"; e.currentTarget.style.color = "#666" }}
      >
        [ SETTINGS ]
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80]"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="fixed right-0 top-0 h-[100dvh] w-full max-w-sm overflow-y-auto"
            style={{
              background: "#080808",
              borderLeft: "1px solid #1e1e1e",
              borderTop: "2px solid #14f195",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-4 py-3 flex items-center justify-between sticky top-0"
              style={{ borderBottom: "1px solid #1e1e1e", background: "#080808", zIndex: 1 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="term-label" style={{ whiteSpace: "nowrap" }}>[ SETTINGS ]</span>
                {!authed && (
                  wallet.connected && wallet.publicKey ? (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.08em",
                        color: "#555",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {wallet.publicKey.toBase58().slice(0, 4)}…{wallet.publicKey.toBase58().slice(-4)}
                    </span>
                  ) : (
                    <button
                      onClick={() => { openWalletModal(true); setOpen(false) }}
                      className="font-mono"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.1em",
                        color: "#f59e0b",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline",
                        textUnderlineOffset: "3px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      CONNECT WALLET TO EDIT
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ ...btnStyle("#333"), flexShrink: 0, marginLeft: "12px" }}
              >
                [ CLOSE ]
              </button>
            </div>

            {/* ── SYSTEM STATUS (open by default) ── */}
            <CollapsibleSection label="[ SYSTEM STATUS ]" defaultOpen>
              <div className="px-4 py-3 font-mono" style={{ fontSize: "9px" }}>
                {[
                  ["MODE", status.mode, status.mode !== "DRY_RUN" ? "#14f195" : "#f59e0b"],
                  ["NETWORK", status.network.toUpperCase(), "#555"],
                  ["SERVICE", status.serviceStatus.toUpperCase(), status.serviceStatus === "active" ? "#14f195" : "#e61919"],
                ].map(([lbl, val, col]) => (
                  <div
                    key={lbl}
                    className="flex justify-between py-1.5"
                    style={{ borderBottom: "1px solid #111" }}
                  >
                    <span style={{ color: "#555", letterSpacing: "0.1em" }}>{lbl}</span>
                    <span style={{ color: col as string, letterSpacing: "0.08em" }}>{val}</span>
                  </div>
                ))}
                {/* Operator auth row */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: authed ? "#14f195" : "#333", flexShrink: 0 }}
                    />
                    <span style={{ color: authed ? "#14f195" : "#444", letterSpacing: "0.1em" }}>
                      OPERATOR {authed ? "AUTHENTICATED" : "NOT SIGNED IN"}
                    </span>
                  </div>
                  {authed ? (
                    <button
                      onClick={() => { clearToken(); setAuthed(false) }}
                      className="font-mono"
                      style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#444", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      [ SIGN OUT ]
                    </button>
                  ) : wallet.connected && wallet.signMessage ? (
                    <AuthButton onAuth={() => setAuthed(true)} />
                  ) : (
                    <span style={{ color: "#2a2a2a", letterSpacing: "0.08em" }}>CONNECT WALLET TO SIGN IN</span>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── FUNDS ── */}
            <CollapsibleSection label="[ FUNDS ]">
              <div>
                {/* Full-width mode toggle */}
                <div className="grid grid-cols-2" style={{ borderBottom: "1px solid #1e1e1e" }}>
                  {(["deposit", "withdraw"] as const).map((m, i) => {
                    const active = fundsMode === m
                    const accent = m === "deposit" ? "#14f195" : "#f59e0b"
                    return (
                      <button
                        key={m}
                        onClick={() => { setFundsMode(m); setFundsMsg(null) }}
                        className="font-mono py-3"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.16em",
                          textTransform: "uppercase",
                          color: active ? accent : "#333",
                          background: active ? `${accent}08` : "transparent",
                          border: "none",
                          borderRight: i === 0 ? "1px solid #1e1e1e" : "none",
                          borderBottom: `2px solid ${active ? accent : "transparent"}`,
                          cursor: "pointer",
                          transition: "color 0.15s, background 0.15s, border-color 0.15s",
                        }}
                      >
                        {m === "deposit" ? "→ DEPOSIT" : "← WITHDRAW"}
                      </button>
                    )
                  })}
                </div>

                <div className="px-4 pt-4 pb-5">
                  {fundsMode === "deposit" ? (
                    <>
                      {/* Balance display */}
                      <div className="mb-5" style={{ borderBottom: "1px solid #111", paddingBottom: "16px" }}>
                        <div className="font-mono mb-3" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#2a2a2a" }}>
                          YOUR BALANCE
                        </div>

                        {!wallet.connected ? (
                          <div className="font-mono" style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "0.1em" }}>
                            CONNECT WALLET TO CONTINUE
                          </div>
                        ) : walletSol === null || walletUsdc === null ? (
                          <div className="flex gap-4 items-center">
                            {[72, 96].map(w => (
                              <div
                                key={w}
                                style={{ width: w, height: 16, background: "#141414", overflow: "hidden", position: "relative" }}
                              >
                                <div style={{
                                  position: "absolute", inset: 0,
                                  background: "linear-gradient(90deg, transparent, #2a2a2a, transparent)",
                                  animation: "shimmer 1.4s infinite",
                                }} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-5 mb-4">
                            <div>
                              <span className="font-mono" style={{ fontSize: "18px", color: "#eaeaea", letterSpacing: "-0.02em", lineHeight: 1 }}>
                                {walletSol.toFixed(4)}
                              </span>
                              <span className="font-mono ml-1.5" style={{ fontSize: "8px", color: "#444", letterSpacing: "0.1em" }}>SOL</span>
                            </div>
                            <div style={{ width: 1, height: 16, background: "#222" }} />
                            <div>
                              <span className="font-mono" style={{ fontSize: "18px", color: "#eaeaea", letterSpacing: "-0.02em", lineHeight: 1 }}>
                                {(walletUsdc ?? 0).toFixed(2)}
                              </span>
                              <span className="font-mono ml-1.5" style={{ fontSize: "8px", color: "#444", letterSpacing: "0.1em" }}>USDC</span>
                            </div>
                          </div>
                        )}

                        {/* Preset size buttons */}
                        {wallet.connected && walletSol !== null && (
                          <div className="flex gap-1.5">
                            {([25, 50, 100] as const).map(pct => {
                              const stepIdx = SLIDER_STEPS.indexOf(pct)
                              const isActive = depositPct === stepIdx
                              return (
                                <button
                                  key={pct}
                                  onClick={() => handleSlider(stepIdx)}
                                  className="font-mono"
                                  style={{
                                    fontSize: "8px",
                                    letterSpacing: "0.12em",
                                    padding: "4px 10px",
                                    border: `1px solid ${isActive ? "#14f195" : "#1e1e1e"}`,
                                    color: isActive ? "#14f195" : "#333",
                                    background: isActive ? "rgba(20,241,149,0.06)" : "transparent",
                                    cursor: "pointer",
                                    transition: "all 0.1s",
                                  }}
                                  onMouseDown={e => { e.currentTarget.style.transform = "scale(0.96)" }}
                                  onMouseUp={e => { e.currentTarget.style.transform = "" }}
                                  onMouseLeave={e => { e.currentTarget.style.transform = "" }}
                                >
                                  {pct === 100 ? "MAX" : `${pct}%`}
                                </button>
                              )
                            })}
                            {depositPct > 0 && (
                              <button
                                onClick={() => { setDepositPct(0); setDepositSol(""); setDepositUsdc("") }}
                                className="font-mono"
                                style={{
                                  fontSize: "8px",
                                  letterSpacing: "0.12em",
                                  padding: "4px 8px",
                                  border: "1px solid #1e1e1e",
                                  color: "#333",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                CLR
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Amount inputs */}
                      <div className="mb-2">
                        <div className="font-mono mb-1" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#333" }}>SOL</div>
                        <div className="flex items-center" style={{ border: "1px solid #1e1e1e", background: "#050505" }}>
                          <span className="font-mono px-3" style={{ fontSize: "11px", color: "#2a2a2a" }}>◎</span>
                          <input
                            type="number"
                            value={depositSol}
                            onChange={e => { setDepositSol(e.target.value); setDepositPct(0) }}
                            placeholder="0.0000"
                            className="font-mono flex-1 py-2.5 pr-3"
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em" }}
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="font-mono mb-1" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#333" }}>USDC</div>
                        <div className="flex items-center" style={{ border: "1px solid #1e1e1e", background: "#050505" }}>
                          <span className="font-mono px-3" style={{ fontSize: "11px", color: "#2a2a2a" }}>$</span>
                          <input
                            type="number"
                            value={depositUsdc}
                            onChange={e => { setDepositUsdc(e.target.value); setDepositPct(0) }}
                            placeholder="0.00"
                            className="font-mono flex-1 py-2.5 pr-3"
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em" }}
                          />
                        </div>
                      </div>

                      {/* Send preview */}
                      {(parseFloat(depositSol) > 0 || parseFloat(depositUsdc) > 0) && (
                        <div
                          className="font-mono mb-4 px-3 py-2.5"
                          style={{
                            background: "rgba(20,241,149,0.03)",
                            border: "1px solid rgba(20,241,149,0.1)",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            lineHeight: 1.7,
                          }}
                        >
                          <span style={{ color: "#14f195" }}>SENDING</span>{" "}
                          {parseFloat(depositSol) > 0 && (
                            <span style={{ color: "#aaa" }}>◎{parseFloat(depositSol).toFixed(4)}</span>
                          )}
                          {parseFloat(depositSol) > 0 && parseFloat(depositUsdc) > 0 && (
                            <span style={{ color: "#444" }}> + </span>
                          )}
                          {parseFloat(depositUsdc) > 0 && (
                            <span style={{ color: "#aaa" }}>${parseFloat(depositUsdc).toFixed(2)} USDC</span>
                          )}
                          <span style={{ color: "#333" }}> → AGENT WALLET</span>
                        </div>
                      )}

                      {/* Action button */}
                      <button
                        onClick={() => void handleDeposit()}
                        disabled={fundsLoading || !wallet.connected}
                        className="w-full font-mono disabled:opacity-30"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          padding: "11px",
                          border: "1px solid #14f195",
                          color: "#14f195",
                          background: "rgba(20,241,149,0.04)",
                          cursor: wallet.connected && !fundsLoading ? "pointer" : "not-allowed",
                          transition: "transform 0.08s, opacity 0.1s",
                        }}
                        onMouseDown={e => { if (!fundsLoading && wallet.connected) e.currentTarget.style.transform = "scale(0.99)" }}
                        onMouseUp={e => { e.currentTarget.style.transform = "" }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "" }}
                      >
                        {fundsLoading
                          ? "SIGNING TRANSACTION…"
                          : wallet.connected
                            ? "[ DEPOSIT TO AGENT ]"
                            : "CONNECT WALLET TO DEPOSIT"}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Withdraw - mirrors deposit, amber accent */}
                      <div className="mb-5" style={{ borderBottom: "1px solid #111", paddingBottom: "16px" }}>
                        <div className="font-mono mb-2" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#2a2a2a" }}>
                          AGENT WALLET BALANCE
                        </div>
                        <div className="flex items-baseline gap-5">
                          <div>
                            <span className="font-mono" style={{ fontSize: "18px", color: authed ? "#eaeaea" : "#2a2a2a", letterSpacing: "-0.02em" }}>—</span>
                            <span className="font-mono ml-1.5" style={{ fontSize: "8px", color: "#444", letterSpacing: "0.1em" }}>SOL</span>
                          </div>
                          <div style={{ width: 1, height: 16, background: "#222" }} />
                          <div>
                            <span className="font-mono" style={{ fontSize: "18px", color: authed ? "#eaeaea" : "#2a2a2a", letterSpacing: "-0.02em" }}>—</span>
                            <span className="font-mono ml-1.5" style={{ fontSize: "8px", color: "#444", letterSpacing: "0.1em" }}>USDC</span>
                          </div>
                        </div>
                        {!authed && (
                          <div className="font-mono mt-2" style={{ fontSize: "8px", color: "#2a2a2a", letterSpacing: "0.1em" }}>
                            AUTHENTICATE TO WITHDRAW
                          </div>
                        )}
                      </div>

                      <div className="mb-2">
                        <div className="font-mono mb-1" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#333" }}>SOL</div>
                        <div className="flex items-center" style={{ border: "1px solid #1e1e1e", background: "#050505", opacity: authed ? 1 : 0.4 }}>
                          <span className="font-mono px-3" style={{ fontSize: "11px", color: "#2a2a2a" }}>◎</span>
                          <input
                            type="number"
                            value={withdrawSol}
                            onChange={e => setWithdrawSol(e.target.value)}
                            placeholder="0.0000"
                            disabled={!authed}
                            className="font-mono flex-1 py-2.5 pr-3"
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em" }}
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="font-mono mb-1" style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#333" }}>USDC</div>
                        <div className="flex items-center" style={{ border: "1px solid #1e1e1e", background: "#050505", opacity: authed ? 1 : 0.4 }}>
                          <span className="font-mono px-3" style={{ fontSize: "11px", color: "#2a2a2a" }}>$</span>
                          <input
                            type="number"
                            value={withdrawUsdc}
                            onChange={e => setWithdrawUsdc(e.target.value)}
                            placeholder="0.00"
                            disabled={!authed}
                            className="font-mono flex-1 py-2.5 pr-3"
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "#eaeaea", letterSpacing: "0.02em" }}
                          />
                        </div>
                      </div>

                      {(parseFloat(withdrawSol) > 0 || parseFloat(withdrawUsdc) > 0) && authed && (
                        <div
                          className="font-mono mb-4 px-3 py-2.5"
                          style={{
                            background: "rgba(245,158,11,0.03)",
                            border: "1px solid rgba(245,158,11,0.1)",
                            fontSize: "9px",
                            letterSpacing: "0.08em",
                            lineHeight: 1.7,
                          }}
                        >
                          <span style={{ color: "#f59e0b" }}>WITHDRAWING</span>{" "}
                          {parseFloat(withdrawSol) > 0 && (
                            <span style={{ color: "#aaa" }}>◎{parseFloat(withdrawSol).toFixed(4)}</span>
                          )}
                          {parseFloat(withdrawSol) > 0 && parseFloat(withdrawUsdc) > 0 && (
                            <span style={{ color: "#444" }}> + </span>
                          )}
                          {parseFloat(withdrawUsdc) > 0 && (
                            <span style={{ color: "#aaa" }}>${parseFloat(withdrawUsdc).toFixed(2)} USDC</span>
                          )}
                          <span style={{ color: "#333" }}> → YOUR WALLET</span>
                        </div>
                      )}

                      <button
                        onClick={() => void handleWithdraw()}
                        disabled={fundsLoading || !authed}
                        className="w-full font-mono disabled:opacity-30"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          padding: "11px",
                          border: "1px solid #f59e0b",
                          color: "#f59e0b",
                          background: "rgba(245,158,11,0.04)",
                          cursor: authed && !fundsLoading ? "pointer" : "not-allowed",
                          transition: "transform 0.08s, opacity 0.1s",
                        }}
                        onMouseDown={e => { if (!fundsLoading && authed) e.currentTarget.style.transform = "scale(0.99)" }}
                        onMouseUp={e => { e.currentTarget.style.transform = "" }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "" }}
                      >
                        {fundsLoading ? "PROCESSING…" : authed ? "[ WITHDRAW TO WALLET ]" : "AUTHENTICATE FIRST"}
                      </button>
                    </>
                  )}

                  {/* Transaction feedback */}
                  {fundsMsg && (
                    <div
                      className="font-mono mt-4 px-3 py-2.5"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.08em",
                        lineHeight: 1.7,
                        background: fundsMsg.startsWith("SENT") || fundsMsg.startsWith("WITHDRAWN")
                          ? "rgba(20,241,149,0.04)"
                          : "rgba(245,158,11,0.04)",
                        border: `1px solid ${fundsMsg.startsWith("SENT") || fundsMsg.startsWith("WITHDRAWN")
                          ? "rgba(20,241,149,0.15)"
                          : "rgba(245,158,11,0.15)"}`,
                        color: fundsMsg.startsWith("SENT") || fundsMsg.startsWith("WITHDRAWN")
                          ? "#14f195"
                          : "#f59e0b",
                      }}
                    >
                      {fundsMsg}
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── AGENT CONTROL ── */}
            <CollapsibleSection label="[ AGENT CONTROL ]">
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div
                      className="font-mono mb-1"
                      style={{ fontSize: "11px", letterSpacing: "0.1em", color: armed ? "#e61919" : "#14f195" }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                        style={{
                          background: armed ? "#e61919" : "#14f195",
                          boxShadow: armed ? "0 0 5px #e61919" : "0 0 5px #14f195",
                        }}
                      />
                      AGENT {armed ? "OFF" : "ON"}
                    </div>
                    <div
                      className="font-mono"
                      style={{ fontSize: "8px", letterSpacing: "0.06em", color: "#333", lineHeight: 1.5 }}
                    >
                      {armed
                        ? "Agent is off — no trades will execute"
                        : "Agent is on — actively managing positions"}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleAgentToggle()}
                    disabled={agentLoading}
                    className="disabled:opacity-40 shrink-0"
                    style={btnStyle(armed ? "#14f195" : "#e61919")}
                  >
                    {agentLoading ? "···" : armed ? "[ TURN ON ]" : "[ TURN OFF ]"}
                  </button>
                </div>
                {agentError && (
                  <span className="font-mono" style={{ fontSize: "9px", color: "#f59e0b", letterSpacing: "0.08em" }}>
                    {agentError}
                  </span>
                )}
              </div>
            </CollapsibleSection>

            {/* ── RISK PARAMETERS ── */}
            <CollapsibleSection label="[ RISK PARAMETERS ]">
              <div>
                {/* telemetry grid — gap:1px background acts as razor dividers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1px",
                    background: "#1a1a1a",
                    borderBottom: "1px solid #1a1a1a",
                  }}
                >
                  <TelemetryCell index="01" label="Position Limit" prefix="$" value={maxPos} onChange={setMaxPos} disabled={!authed} />
                  <TelemetryCell index="02" label="Capital Cap" prefix="$" value={maxDep} onChange={setMaxDep} disabled={!authed} />
                  <TelemetryCell index="03" label="Daily Loss" suffix="%" value={lossLim} onChange={setLossLim} disabled={!authed} danger />
                  <TelemetryCell index="04" label="Max Positions" value={maxOpenPos} onChange={setMaxOpenPos} disabled={!authed} />
                  <TelemetryCell index="05" label="Exit Volatility" suffix="%" value={exitVol} onChange={setExitVol} disabled={!authed} danger span />
                </div>

                {/* apply row */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: "#060606" }}
                >
                  <button
                    onClick={() => void handleSaveRisk()}
                    disabled={riskSaving || !authed}
                    className="font-mono disabled:opacity-30"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "#14f195",
                      background: "transparent",
                      border: "1px solid #14f19530",
                      padding: "5px 14px",
                      cursor: riskSaving || !authed ? "not-allowed" : "pointer",
                      transition: "border-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={e => { if (!riskSaving && authed) { e.currentTarget.style.borderColor = "#14f195"; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#14f19530"; }}
                    onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
                    onMouseUp={e => { e.currentTarget.style.transform = ""; }}
                  >
                    {riskSaving ? "···" : "[ APPLY CHANGES ]"}
                  </button>
                  {riskMsg && (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.14em",
                        color: riskMsg === "SAVED" ? "#14f195" : "#E61919",
                      }}
                    >
                      {riskMsg === "SAVED" ? "// WRITTEN" : `// ${riskMsg}`}
                    </span>
                  )}
                  {!authed && (
                    <span className="font-mono" style={{ fontSize: "8px", letterSpacing: "0.1em", color: "#2a2a2a" }}>
                      // AUTH REQUIRED
                    </span>
                  )}
                </div>
              </div>
            </CollapsibleSection>

            {/* ── LLM PROVIDER ── */}
            <CollapsibleSection label="[ LLM PROVIDER ]">
              <div className="px-4 py-4" style={{ paddingBottom: "80px" }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div
                      className="font-mono mb-1"
                      style={{ fontSize: "10px", letterSpacing: "0.1em", color: llmEnabled ? "#14f195" : "#555" }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                        style={{ background: llmEnabled ? "#14f195" : "#333" }}
                      />
                      LLM {llmEnabled ? "ENABLED" : "DISABLED"}
                    </div>
                    <div
                      className="font-mono"
                      style={{ fontSize: "8px", color: keyConfigured ? "#14f195" : "#333", letterSpacing: "0.08em" }}
                    >
                      {keyConfigured ? "API KEY CONFIGURED" : "NO API KEY"}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleLlmToggle()}
                    disabled={llmLoading || !authed}
                    className="disabled:opacity-40 shrink-0"
                    style={btnStyle(llmEnabled ? "#f59e0b" : "#14f195")}
                  >
                    {llmLoading ? "···" : llmEnabled ? "[ DISABLE ]" : "[ ENABLE ]"}
                  </button>
                </div>

                <div className="flex gap-1.5 mb-4">
                  {(["anthropic", "openai"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setLlmProvider(p)}
                      className="font-mono"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        padding: "4px 10px",
                        border: `1px solid ${llmProvider === p ? "#14f195" : "#2a2a2a"}`,
                        color: llmProvider === p ? "#14f195" : "#444",
                        background: llmProvider === p ? "rgba(20,241,149,0.06)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {p === "anthropic" ? "ANTHROPIC" : "OPENAI"}
                    </button>
                  ))}
                </div>

                {(llmEnabled || !keyConfigured) && (
                  <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: "14px" }}>
                    <div
                      className="font-mono mb-2"
                      style={{ fontSize: "8px", letterSpacing: "0.14em", color: "#444", textTransform: "uppercase" }}
                    >
                      {llmProvider === "anthropic" ? "ANTHROPIC" : "OPENAI"} API KEY
                    </div>
                    <div className="flex gap-1.5 mb-2">
                      <input
                        type={llmKeyVisible ? "text" : "password"}
                        value={llmKey}
                        onChange={e => setLlmKey(e.target.value)}
                        placeholder={keyPlaceholder}
                        className="font-mono flex-1 min-w-0"
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.04em",
                          color: "#aaa",
                          background: "#0d0d0d",
                          border: "1px solid #2a2a2a",
                          padding: "5px 8px",
                          outline: "none",
                        }}
                      />
                      <button onClick={() => setLlmKeyVisible(v => !v)} style={btnStyle("#333")}>
                        {llmKeyVisible ? "HIDE" : "SHOW"}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void handleSaveLlmKey()}
                        disabled={llmKeySaving || !authed || !llmKey.trim()}
                        className="disabled:opacity-40"
                        style={btnStyle("#14f195")}
                      >
                        {llmKeySaving ? "···" : "[ SAVE KEY ]"}
                      </button>
                      {llmMsg && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: "9px",
                            letterSpacing: "0.1em",
                            color: llmMsg.includes("SAVED") ? "#14f195" : "#f59e0b",
                          }}
                        >
                          {llmMsg}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {llmMsg && !(llmEnabled || !keyConfigured) && !llmMsg.includes("SAVED") && (
                  <span
                    className="font-mono mt-2 block"
                    style={{ fontSize: "9px", color: "#f59e0b", letterSpacing: "0.08em" }}
                  >
                    {llmMsg}
                  </span>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}
    </>
  )
}
