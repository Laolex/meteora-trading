"use client"

import { useEffect, useState, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { verifyWallet, clearToken } from "@/lib/auth"

// Only the operator wallet goes through JWT auth. Everyone else connects as investor.
const OPERATOR_PUBKEY = process.env.NEXT_PUBLIC_AUTHORIZED_PUBKEY ?? ""

type AuthState = "idle" | "signing" | "verified" | "investor" | "error"

export default function WalletButton() {
  const { connected, publicKey, disconnect, signMessage } = useWallet()
  const [state, setState] = useState<AuthState>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_API_URL)

  const isOperator = publicKey?.toBase58() === OPERATOR_PUBKEY

  const attemptVerify = useCallback(async () => {
    if (!publicKey || !signMessage) return

    // Non-operator wallets: just mark as investor, no auth needed
    if (!isOperator || !authEnabled) {
      setState("investor")
      return
    }

    setState("signing")
    setErrorMsg("")
    try {
      await verifyWallet(publicKey.toBase58(), signMessage)
      setState("verified")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      setState("error")
    }
  }, [authEnabled, isOperator, publicKey, signMessage])

  useEffect(() => {
    if (connected && publicKey) {
      const timer = setTimeout(() => { void attemptVerify() }, 0)
      return () => clearTimeout(timer)
    } else {
      clearToken()
      setState("idle")
    }
  }, [attemptVerify, connected, publicKey])

  const handleDisconnect = async () => {
    try {
      await disconnect()
      clearToken()
      setState("idle")
    } catch {
      setState("error")
    }
  }

  // Not connected — show wallet picker button styled to match nav
  if (!connected) {
    return (
      <WalletMultiButton
        style={{
          background: "transparent",
          border: "1px solid #14f195",
          color: "#14f195",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "0.5rem 1rem",
          height: "auto",
          lineHeight: "1.25rem",
          minHeight: "44px",
        }}
      />
    )
  }

  const pubStr = publicKey?.toBase58() ?? ""
  const shortPub = pubStr.length >= 8 ? `${pubStr.slice(0, 4)}…${pubStr.slice(-4)}` : pubStr

  if (state === "signing") {
    return (
      <span
        className="text-xs font-medium px-4 py-2 rounded-full border min-h-11 inline-flex items-center"
        style={{ borderColor: "#f59e0b", color: "#f59e0b", background: "transparent" }}
      >
        Signing…
      </span>
    )
  }

  if (state === "verified") {
    return (
      <button
        onClick={() => void handleDisconnect()}
        className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border transition-colors min-h-11"
        style={{ borderColor: "#14f195", color: "#14f195", background: "transparent" }}
        title="Click to disconnect"
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: "#14f195", flexShrink: 0 }}
        />
        {shortPub}
      </button>
    )
  }

  // investor — connected, can use vault, no admin access
  if (state === "investor") {
    return (
      <button
        onClick={() => void handleDisconnect()}
        className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border transition-colors min-h-11"
        style={{ borderColor: "#14f195", color: "#14f195", background: "transparent" }}
        title="Connected as investor — click to disconnect"
      >
        <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#14f195", flexShrink: 0 }} />
        {shortPub}
      </button>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full border min-h-11 inline-flex items-center"
            style={{ borderColor: "#f59e0b", color: "#f59e0b", background: "transparent" }}
          >
            Sign failed — retry
          </span>
          <button
            onClick={() => void attemptVerify()}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors min-h-11"
            style={{ borderColor: "#14f195", color: "#14f195", background: "transparent" }}
          >
            Retry
          </button>
        </div>
        {errorMsg && (
          <span className="text-xs max-w-xs truncate" style={{ color: "#888" }} title={errorMsg}>
            {errorMsg}
          </span>
        )}
      </div>
    )
  }

  // idle while connected (shouldn't normally be reached)
  return null
}
