"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, type Connection } from "@solana/web3.js"
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { getVaultState, type VaultState } from "@/lib/api"
import { isAuthenticated, vaultManagerWithdraw, vaultManagerReturn } from "@/lib/auth"
import Card from "./Card"

const SPRING = { type: "spring" as const, stiffness: 400, damping: 17 }

// Vault program constants
const PROGRAM_ID = new PublicKey("986ARRxoPAkVTAP4YcKyGMyyLm5736s3g2ZXp9aNqxFs")
const VAULT_SEED = Buffer.from("vault")
const DEPOSITOR_SEED = Buffer.from("depositor")
const SHARE_MINT_SEED = Buffer.from("share_mint")
const VAULT_USDC_SEED = Buffer.from("vault_usdc")

// Anchor instruction discriminators (sha256("global:<name>")[0:8])
const DISC_DEPOSIT = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182])
const DISC_WITHDRAW = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])

function u64LE(n: bigint): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, n, true)
  return new Uint8Array(buf)
}

function fmt(n: number, decimals = 2) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

async function fetchShareBalance(
  connection: Connection,
  investorPubkey: PublicKey,
  shareMintStr: string,
): Promise<number> {
  const shareMint = new PublicKey(shareMintStr)
  const shareAta = await getAssociatedTokenAddress(shareMint, investorPubkey)
  const bal = await connection.getTokenAccountBalance(shareAta).catch(() => null)
  if (!bal) return 0
  return Number(bal.value.amount) / 1_000_000
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

interface ShareWithdrawFormProps {
  shareBalance: number | null
  onSubmit: (shares: number) => Promise<{ ok: boolean; signature: string }>
  onSuccess: () => void
}

function ShareWithdrawForm({ shareBalance, onSubmit, onSuccess }: ShareWithdrawFormProps) {
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [successSig, setSuccessSig] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const presets = [1, 5, 10] as const

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
      onSuccess()
      setTimeout(() => setSuccessSig(null), 10000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 10000)
    } finally {
      setLoading(false)
    }
  }

  const allShares = shareBalance ?? 0

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-[#8b95a3]">Withdraw Shares</span>
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
          onClick={() => setAmount(allShares > 0 ? allShares.toFixed(6) : "")}
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
          step="0.000001"
          placeholder="Shares"
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
          {loading ? "…" : "Withdraw"}
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

  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [shareBalance, setShareBalance] = useState<number | null>(null)
  const [shareBalanceLoading, setShareBalanceLoading] = useState(false)

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

  // Fetch investor share balance when investor tab active and wallet connected
  useEffect(() => {
    if (tab !== "investor" || !publicKey || !state?.initialized || !state?.shareMint) {
      setShareBalance(null)
      return
    }
    setShareBalanceLoading(true)
    fetchShareBalance(connection, publicKey, state.shareMint)
      .then(setShareBalance)
      .catch(() => setShareBalance(0))
      .finally(() => setShareBalanceLoading(false))
  }, [publicKey, tab, state?.shareMint, connection, state?.initialized])

  // Capital flow calculations
  const deployedUsd = state?.managerWithdrawn
    ? Number(state.managerWithdrawn) / 1_000_000
    : 0
  const idleUsd = (state?.totalAumUsd ?? 0) - deployedUsd
  const capUsd = state?.depositCapUsd ?? 1
  const deployedPct = Math.min(100, (deployedUsd / capUsd) * 100)
  const idlePct = Math.min(100 - deployedPct, (idleUsd / capUsd) * 100)

  async function handleDeposit(amountUsdc: number): Promise<{ ok: boolean; signature: string }> {
    if (!publicKey || !state?.usdcMint || !state?.shareMint) throw new Error("Wallet not connected")

    const usdcMint = new PublicKey(state.usdcMint)
    const [vault] = PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
    const [vaultUsdc] = PublicKey.findProgramAddressSync([VAULT_USDC_SEED], PROGRAM_ID)
    const [shareMint] = PublicKey.findProgramAddressSync([SHARE_MINT_SEED], PROGRAM_ID)
    const [vaultDepositor] = PublicKey.findProgramAddressSync(
      [DEPOSITOR_SEED, publicKey.toBuffer()],
      PROGRAM_ID,
    )
    const depositorUsdc = await getAssociatedTokenAddress(usdcMint, publicKey)
    const depositorShares = await getAssociatedTokenAddress(shareMint, publicKey)

    const data = Buffer.concat([DISC_DEPOSIT, u64LE(BigInt(Math.round(amountUsdc * 1_000_000)))])

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: vaultUsdc, isSigner: false, isWritable: true },
        { pubkey: shareMint, isSigner: false, isWritable: true },
        { pubkey: depositorUsdc, isSigner: false, isWritable: true },
        { pubkey: depositorShares, isSigner: false, isWritable: true },
        { pubkey: vaultDepositor, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction().add(ix)
    tx.recentBlockhash = blockhash
    tx.feePayer = publicKey

    const sig = await sendTransaction(tx, connection)
    await connection.confirmTransaction(sig, "confirmed")
    return { ok: true, signature: sig }
  }

  async function handleWithdraw(shares: number): Promise<{ ok: boolean; signature: string }> {
    if (!publicKey || !state?.usdcMint || !state?.shareMint) throw new Error("Wallet not connected")

    const usdcMint = new PublicKey(state.usdcMint)
    const [vault] = PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
    const [vaultUsdc] = PublicKey.findProgramAddressSync([VAULT_USDC_SEED], PROGRAM_ID)
    const [shareMint] = PublicKey.findProgramAddressSync([SHARE_MINT_SEED], PROGRAM_ID)
    const [vaultDepositor] = PublicKey.findProgramAddressSync(
      [DEPOSITOR_SEED, publicKey.toBuffer()],
      PROGRAM_ID,
    )
    const depositorUsdc = await getAssociatedTokenAddress(usdcMint, publicKey)
    const depositorShares = await getAssociatedTokenAddress(shareMint, publicKey)

    const data = Buffer.concat([DISC_WITHDRAW, u64LE(BigInt(Math.round(shares * 1_000_000)))])

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: publicKey, isSigner: true, isWritable: true },
        { pubkey: vault, isSigner: false, isWritable: true },
        { pubkey: vaultUsdc, isSigner: false, isWritable: true },
        { pubkey: shareMint, isSigner: false, isWritable: true },
        { pubkey: depositorUsdc, isSigner: false, isWritable: true },
        { pubkey: depositorShares, isSigner: false, isWritable: true },
        { pubkey: vaultDepositor, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })

    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction().add(ix)
    tx.recentBlockhash = blockhash
    tx.feePayer = publicKey

    const sig = await sendTransaction(tx, connection)
    await connection.confirmTransaction(sig, "confirmed")
    return { ok: true, signature: sig }
  }

  function refreshShareBalance() {
    if (!publicKey || !state?.initialized || !state?.shareMint) return
    setShareBalanceLoading(true)
    fetchShareBalance(connection, publicKey, state.shareMint)
      .then(setShareBalance)
      .catch(() => setShareBalance(0))
      .finally(() => setShareBalanceLoading(false))
  }

  const depositCapacityLeft = Math.max(0, (state?.depositCapUsd ?? 0) - (state?.totalAumUsd ?? 0))
  const shareValue =
    shareBalance !== null && state?.navPerShareUsd
      ? shareBalance * state.navPerShareUsd
      : null

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
            <div className="flex flex-col gap-4 pt-1">
              {!publicKey ? (
                <p className="text-xs" style={{ color: "#555" }}>
                  Connect wallet to deposit or withdraw.
                </p>
              ) : (
                <>
                  {/* Share balance info */}
                  <div className="flex flex-col gap-0">
                    <div className="flex justify-between items-baseline py-1.5 border-b border-white/5">
                      <span className="text-xs text-[#8b95a3]">Your shares</span>
                      <span className="text-xs font-mono text-[#c8d0d9]">
                        {shareBalanceLoading
                          ? "…"
                          : shareBalance !== null
                            ? shareBalance.toFixed(6)
                            : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline py-1.5">
                      <span className="text-xs text-[#8b95a3]">Value</span>
                      <span className="text-xs font-mono text-[#c8d0d9]">
                        {shareBalanceLoading
                          ? "…"
                          : shareValue !== null
                            ? fmt(shareValue)
                            : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Deposit form */}
                  <ActionForm
                    label="Deposit USDC"
                    buttonText="Deposit"
                    allAmount={depositCapacityLeft}
                    onSubmit={async (amount) => {
                      const result = await handleDeposit(amount)
                      refreshShareBalance()
                      return result
                    }}
                  />

                  {/* Withdraw form */}
                  <ShareWithdrawForm
                    shareBalance={shareBalance}
                    onSubmit={handleWithdraw}
                    onSuccess={refreshShareBalance}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}
