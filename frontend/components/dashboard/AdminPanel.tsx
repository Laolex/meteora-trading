"use client"

import { useState, useEffect } from "react"
import { isAuthenticated, adminKillSwitch } from "@/lib/auth"

interface AdminPanelProps {
  initialArmed: boolean
}

export default function AdminPanel({ initialArmed }: AdminPanelProps) {
  const [authed, setAuthed] = useState(false)
  const [armed, setArmed] = useState(initialArmed)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAuthed(isAuthenticated())
  }, [])

  if (!authed) return null

  const handleToggle = async () => {
    setLoading(true)
    setError(null)
    const next = !armed
    setArmed(next)
    try {
      const result = await adminKillSwitch(next)
      setArmed(result.armed)
    } catch (err) {
      setArmed(!next)
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="mb-8 font-mono"
      style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}
    >
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ ADMIN CONTROLS ]</span>
      </div>

      <div className="px-4 py-4 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => void handleToggle()}
          disabled={loading}
          className="font-mono transition-colors disabled:opacity-40"
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "6px 16px",
            border: `1px solid ${armed ? "#14f195" : "#e61919"}`,
            color: armed ? "#14f195" : "#e61919",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {loading ? "···" : armed ? "[ DISARM KILL SWITCH ]" : "[ ARM KILL SWITCH ]"}
        </button>

        {armed && (
          <span style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#e61919" }}>
            ● AGENT HALTED — KILL SWITCH ACTIVE
          </span>
        )}

        {error && (
          <span style={{ fontSize: "9px", letterSpacing: "0.08em", color: "#f59e0b" }}>
            ERR: {error}
          </span>
        )}
      </div>
    </div>
  )
}
