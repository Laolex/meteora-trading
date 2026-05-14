"use client"

import { useEffect, useState } from "react"
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, type Connection } from "@solana/web3.js"
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { getVaultState, type VaultState } from "@/lib/api"
import { isAuthenticated, vaultManagerWithdraw, vaultManagerReturn } from "@/lib/auth"

const PROGRAM_ID = new PublicKey("986ARRxoPAkVTAP4YcKyGMyyLm5736s3g2ZXp9aNqxFs")
const VAULT_SEED = Buffer.from("vault")
const DEPOSITOR_SEED = Buffer.from("depositor")
const SHARE_MINT_SEED = Buffer.from("share_mint")
const VAULT_USDC_SEED = Buffer.from("vault_usdc")

const DISC_DEPOSIT  = Buffer.from([242, 35, 198, 137, 82, 225, 242, 182])
const DISC_WITHDRAW = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34])

function u64LE(n: bigint): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, n, true)
  return new Uint8Array(buf)
}

function fmt(n: number, decimals = 2) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

async function fetchShareBalance(connection: Connection, investorPubkey: PublicKey, shareMintStr: string): Promise<number> {
  const shareMint = new PublicKey(shareMintStr)
  const shareAta = await getAssociatedTokenAddress(shareMint, investorPubkey)
  const bal = await connection.getTokenAccountBalance(shareAta).catch(() => null)
  if (!bal) return 0
  return Number(bal.value.amount) / 1_000_000
}

const inputStyle: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid #1e1e1e",
  color: "#eaeaea",
  fontFamily: "monospace",
  fontSize: "10px",
  padding: "5px 8px",
  outline: "none",
  letterSpacing: "0.04em",
  flex: 1,
  minWidth: "80px",
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
    setLoading(true); setSuccessSig(null); setErrorMsg(null)
    try {
      const res = await onSubmit(parsed)
      setSuccessSig(res.signature); setAmount("")
      setTimeout(() => setSuccessSig(null), 10000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setTimeout(() => setErrorMsg(null), 10000)
    } finally { setLoading(false) }
  }

  return (
    <div>
      <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#444", textTransform: "uppercase" }}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1 items-center mt-1.5">
        {presets.map(p => (
          <button key={p} type="button" disabled={loading} onClick={() => setAmount(String(p))}
            className="font-mono"
            style={{
              fontSize: "8px", letterSpacing: "0.08em", padding: "3px 7px",
              border: `1px solid ${amount === String(p) ? "#14f195" : "#1e1e1e"}`,
              color: amount === String(p) ? "#14f195" : "#444",
              background: "transparent", cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
        <button type="button" disabled={loading} onClick={() => setAmount(allAmount > 0 ? allAmount.toFixed(2) : "")}
          className="font-mono"
          style={{ fontSize: "8px", letterSpacing: "0.08em", padding: "3px 7px", border: "1px solid #1e1e1e", color: "#444", background: "transparent", cursor: "pointer" }}
        >
          ALL
        </button>
        <input type="number" min="0" step="0.01" placeholder="USDC" value={amount}
          onChange={e => setAmount(e.target.value)} disabled={loading} style={inputStyle}
        />
      </div>
      <form onSubmit={e => void handleSubmit(e)} className="flex justify-end mt-1.5">
        <button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}
          className="font-mono transition-colors disabled:opacity-40"
          style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", padding: "5px 12px", border: "1px solid #14f195", color: "#14f195", background: "transparent", cursor: "pointer" }}
        >
          {loading ? "···" : `[ ${buttonText.toUpperCase()} ]`}
        </button>
      </form>
      {successSig && (
        <a href={`https://solscan.io/tx/${successSig}`} target="_blank" rel="noopener noreferrer"
          className="block mt-1 font-mono truncate" style={{ fontSize: "8px", color: "#14f195", letterSpacing: "0.04em" }}
        >
          TX: {successSig.slice(0, 8)}…{successSig.slice(-8)}
        </a>
      )}
      {errorMsg && (
        <span className="font-mono" style={{ fontSize: "8px", color: "#e61919", letterSpacing: "0.04em" }}>ERR: {errorMsg}</span>
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
  const allShares = shareBalance ?? 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return
    setLoading(true); setSuccessSig(null); setErrorMsg(null)
    try {
      const res = await onSubmit(parsed)
      setSuccessSig(res.signature); setAmount(""); onSuccess()
      setTimeout(() => setSuccessSig(null), 10000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 10000)
    } finally { setLoading(false) }
  }

  return (
    <div>
      <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#444", textTransform: "uppercase" }}>
        WITHDRAW SHARES
      </span>
      <div className="flex flex-wrap gap-1 items-center mt-1.5">
        {presets.map(p => (
          <button key={p} type="button" disabled={loading} onClick={() => setAmount(String(p))}
            className="font-mono"
            style={{
              fontSize: "8px", letterSpacing: "0.08em", padding: "3px 7px",
              border: `1px solid ${amount === String(p) ? "#14f195" : "#1e1e1e"}`,
              color: amount === String(p) ? "#14f195" : "#444",
              background: "transparent", cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
        <button type="button" disabled={loading} onClick={() => setAmount(allShares > 0 ? allShares.toFixed(6) : "")}
          className="font-mono"
          style={{ fontSize: "8px", padding: "3px 7px", border: "1px solid #1e1e1e", color: "#444", background: "transparent", cursor: "pointer" }}
        >
          ALL
        </button>
        <input type="number" min="0" step="0.000001" placeholder="Shares" value={amount}
          onChange={e => setAmount(e.target.value)} disabled={loading} style={inputStyle}
        />
      </div>
      <form onSubmit={e => void handleSubmit(e)} className="flex justify-end mt-1.5">
        <button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}
          className="font-mono transition-colors disabled:opacity-40"
          style={{ fontSize: "9px", letterSpacing: "0.1em", padding: "5px 12px", border: "1px solid #14f195", color: "#14f195", background: "transparent", cursor: "pointer" }}
        >
          {loading ? "···" : "[ WITHDRAW ]"}
        </button>
      </form>
      {successSig && (
        <a href={`https://solscan.io/tx/${successSig}`} target="_blank" rel="noopener noreferrer"
          className="block mt-1 font-mono truncate" style={{ fontSize: "8px", color: "#14f195" }}
        >
          TX: {successSig.slice(0, 8)}…{successSig.slice(-8)}
        </a>
      )}
      {errorMsg && (
        <span className="font-mono" style={{ fontSize: "8px", color: "#e61919" }}>ERR: {errorMsg}</span>
      )}
    </div>
  )
}

export default function VaultPanel() {
  const [state, setState] = useState<VaultState | null>(null)
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState<"manager" | "investor">("investor")
  const [collapsed, setCollapsed] = useState(true)

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

  useEffect(() => {
    if (tab !== "investor" || !publicKey || !state?.initialized || !state?.shareMint) {
      setShareBalance(null); return
    }
    setShareBalanceLoading(true)
    fetchShareBalance(connection, publicKey, state.shareMint)
      .then(setShareBalance).catch(() => setShareBalance(0))
      .finally(() => setShareBalanceLoading(false))
  }, [publicKey, tab, state?.shareMint, connection, state?.initialized])

  const deployedUsd = state?.managerWithdrawn ? Number(state.managerWithdrawn) / 1_000_000 : 0
  const idleUsd = (state?.totalAumUsd ?? 0) - deployedUsd
  const capUsd = state?.depositCapUsd ?? 1
  const deployedPct = Math.min(100, (deployedUsd / capUsd) * 100)
  const idlePct = Math.min(100 - deployedPct, (idleUsd / capUsd) * 100)
  const depositCapacityLeft = Math.max(0, (state?.depositCapUsd ?? 0) - (state?.totalAumUsd ?? 0))
  const shareValue = shareBalance !== null && state?.navPerShareUsd
    ? shareBalance * state.navPerShareUsd : null

  async function handleDeposit(amountUsdc: number): Promise<{ ok: boolean; signature: string }> {
    if (!publicKey || !state?.usdcMint || !state?.shareMint) throw new Error("Wallet not connected")
    const usdcMint = new PublicKey(state.usdcMint)
    const [vault] = PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
    const [vaultUsdc] = PublicKey.findProgramAddressSync([VAULT_USDC_SEED], PROGRAM_ID)
    const [shareMint] = PublicKey.findProgramAddressSync([SHARE_MINT_SEED], PROGRAM_ID)
    const [vaultDepositor] = PublicKey.findProgramAddressSync([DEPOSITOR_SEED, publicKey.toBuffer()], PROGRAM_ID)
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
    tx.recentBlockhash = blockhash; tx.feePayer = publicKey
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
    const [vaultDepositor] = PublicKey.findProgramAddressSync([DEPOSITOR_SEED, publicKey.toBuffer()], PROGRAM_ID)
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
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })
    const { blockhash } = await connection.getLatestBlockhash()
    const tx = new Transaction().add(ix)
    tx.recentBlockhash = blockhash; tx.feePayer = publicKey
    const sig = await sendTransaction(tx, connection)
    await connection.confirmTransaction(sig, "confirmed")
    return { ok: true, signature: sig }
  }

  function refreshShareBalance() {
    if (!publicKey || !state?.initialized || !state?.shareMint) return
    setShareBalanceLoading(true)
    fetchShareBalance(connection, publicKey, state.shareMint)
      .then(setShareBalance).catch(() => setShareBalance(0))
      .finally(() => setShareBalanceLoading(false))
  }

  return (
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: collapsed ? "none" : "1px solid #141414", background: "transparent", cursor: "pointer" }}
      >
        <span className="term-label">[ ON-CHAIN VAULT ]</span>
        <div className="flex items-center gap-2">
          <span className="font-mono" style={{
            fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#444",
          }}>
            DEVNET ONLY
          </span>
          <span className="font-mono" style={{ fontSize: "9px", color: "#333" }}>{collapsed ? "+" : "−"}</span>
        </div>
      </button>

      {!collapsed && (
        <p className="px-4 py-3 font-mono" style={{ fontSize: "9px", color: "#444", letterSpacing: "0.06em", lineHeight: 1.7 }}>
          ON-CHAIN VAULT PROGRAM NOT YET DEPLOYED TO MAINNET.<br />
          INVESTOR DEPOSITS UNAVAILABLE UNTIL MAINNET LAUNCH.
        </p>
      )}

    </div>
  )
}
