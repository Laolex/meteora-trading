"use client"

import { useEffect, useState, useCallback } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { verifyWallet, clearToken } from "@/lib/auth"

type AuthState = "idle" | "signing" | "verified" | "unauthorized" | "error"

export default function WalletButton() {
  const { connected, publicKey, disconnect, signMessage } = useWallet()
  const [state, setState] = useState<AuthState>("idle")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_API_URL)

  const attemptVerify = useCallback(async () => {
    if (!authEnabled) {
      setState("verified")
      return
    }
    if (!publicKey || !signMessage) return
    setState("signing")
    setErrorMsg("")
    try {
      await verifyWallet(publicKey.toBase58(), signMessage)
      setState("verified")
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
      if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized")) {
        setState("unauthorized")
      } else {
        setState("error")
      }
    }
  }, [authEnabled, publicKey, signMessage])

  useEffect(() => {
    if (connected && publicKey) {
      const timer = setTimeout(() => {
        void attemptVerify()
      }, 0)
      return () => clearTimeout(timer)
    } else {
      clearToken()
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
          padding: "0.375rem 1rem",
          height: "auto",
          lineHeight: "1.25rem",
        }}
      />
    )
  }

  const pubStr = publicKey?.toBase58() ?? ""
  const shortPub = pubStr.length >= 8 ? `${pubStr.slice(0, 4)}…${pubStr.slice(-4)}` : pubStr

  if (state === "signing") {
    return (
      <span
        className="text-xs font-medium px-4 py-2 rounded-full border"
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
        className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full border transition-colors"
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

  if (state === "unauthorized") {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium px-3 py-1.5 rounded-full border"
          style={{ borderColor: "#ef4444", color: "#ef4444", background: "transparent" }}
        >
          Unauthorized
        </span>
        <button
          onClick={() => void handleDisconnect()}
          className="text-xs px-3 py-1.5 rounded-full border transition-colors"
          style={{ borderColor: "#555", color: "#888", background: "transparent" }}
        >
          Disconnect
        </button>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full border"
            style={{ borderColor: "#f59e0b", color: "#f59e0b", background: "transparent" }}
          >
            Sign failed — retry
          </span>
          <button
            onClick={() => void attemptVerify()}
            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
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
