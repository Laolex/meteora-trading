"use client"

import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js"
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"

const HOT_WALLET = new PublicKey("9fXLvgjnfngxKCusuv7AGchM3JsnreMtF1YBBKpwsibr")
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
const USDC_DECIMALS = 6
const EXPLORER = "https://solscan.io/tx"

export default function FundAgentPanel() {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()

  const [sol, setSol] = useState("")
  const [usdc, setUsdc] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [sig, setSig] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    if (!publicKey) return
    const solAmt = parseFloat(sol) || 0
    const usdcAmt = parseFloat(usdc) || 0
    if (solAmt <= 0 && usdcAmt <= 0) return

    setStatus("sending")
    setError(null)
    setSig(null)

    try {
      const tx = new Transaction()

      if (solAmt > 0) {
        tx.add(SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: HOT_WALLET,
          lamports: Math.round(solAmt * LAMPORTS_PER_SOL),
        }))
      }

      if (usdcAmt > 0) {
        const senderATA = await getAssociatedTokenAddress(USDC_MINT, publicKey)
        const recipientATA = await getAssociatedTokenAddress(USDC_MINT, HOT_WALLET)

        const recipientInfo = await connection.getAccountInfo(recipientATA)
        if (!recipientInfo) {
          tx.add(createAssociatedTokenAccountInstruction(
            publicKey, recipientATA, HOT_WALLET, USDC_MINT,
            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID,
          ))
        }

        tx.add(createTransferCheckedInstruction(
          senderATA, USDC_MINT, recipientATA, publicKey,
          BigInt(Math.round(usdcAmt * 10 ** USDC_DECIMALS)),
          USDC_DECIMALS,
        ))
      }

      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey

      const signature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, "confirmed")

      setSig(signature)
      setStatus("done")
      setSol("")
      setUsdc("")
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!connected) return null

  const canSend = (parseFloat(sol) > 0 || parseFloat(usdc) > 0) && status !== "sending"

  const inputStyle: React.CSSProperties = {
    background: "#0a0a0a",
    border: "1px solid #1e1e1e",
    color: "#eaeaea",
    fontFamily: "monospace",
    fontSize: "11px",
    padding: "6px 10px",
    width: "100%",
    outline: "none",
    letterSpacing: "0.04em",
  }

  return (
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {/* Header */}
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ FUND AGENT ]</span>
      </div>

      <div className="px-4 py-3">
        <p className="font-mono break-all mb-3" style={{ fontSize: "8px", letterSpacing: "0.04em", color: "#333" }}>
          {HOT_WALLET.toBase58()}
        </p>

        <div style={{ display: "grid", gap: "6px", marginBottom: "10px" }}>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" step="0.01" placeholder="0.05"
              value={sol} onChange={e => setSol(e.target.value)}
              style={inputStyle}
            />
            <span className="font-mono" style={{ fontSize: "9px", color: "#555", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>SOL</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" step="1" placeholder="100"
              value={usdc} onChange={e => setUsdc(e.target.value)}
              style={inputStyle}
            />
            <span className="font-mono" style={{ fontSize: "9px", color: "#555", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>USDC</span>
          </div>
        </div>

        <button
          onClick={() => void send()}
          disabled={!canSend}
          className="w-full font-mono transition-colors disabled:opacity-40"
          style={{
            fontSize: "9px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "7px",
            border: "1px solid #14f195",
            color: "#14f195",
            background: "transparent",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          {status === "sending" ? "···" : "[ SEND TO AGENT WALLET ]"}
        </button>

        {status === "done" && sig && (
          <a
            href={`${EXPLORER}/${sig}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-2 font-mono truncate text-center"
            style={{ fontSize: "9px", letterSpacing: "0.06em", color: "#14f195" }}
          >
            TX: {sig.slice(0, 8)}…{sig.slice(-8)} ↗
          </a>
        )}

        {status === "error" && error && (
          <p className="mt-2 font-mono" style={{ fontSize: "9px", color: "#e61919", letterSpacing: "0.04em" }}>
            ERR: {error}
          </p>
        )}
      </div>
    </div>
  )
}
