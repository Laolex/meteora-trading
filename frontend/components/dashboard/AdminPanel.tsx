"use client"

import { useState } from "react"
import { isAuthenticated, adminKillSwitch } from "@/lib/auth"

interface AdminPanelProps {
  initialArmed: boolean
}

export default function AdminPanel({ initialArmed }: AdminPanelProps) {
  const [armed, setArmed] = useState(initialArmed)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthenticated()) return null

  const handleToggle = async () => {
    setLoading(true)
    setError(null)
    const next = !armed
    setArmed(next) // optimistic
    try {
      const result = await adminKillSwitch(next)
      setArmed(result.armed)
    } catch (err) {
      setArmed(!next) // revert
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{
        background: "#0f0f0f",
        border: "1px solid #1a1a1a",
      }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: "#888888" }}>
        Admin Controls
      </h2>

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleToggle}
          disabled={loading}
          className="text-xs font-semibold px-5 py-2.5 rounded-full border transition-colors disabled:opacity-50"
          style={
            armed
              ? { borderColor: "#14f195", color: "#14f195", background: "transparent" }
              : { borderColor: "#ef4444", color: "#ef4444", background: "transparent" }
          }
        >
          {loading ? "…" : armed ? "Disarm Kill Switch" : "Arm Kill Switch"}
        </button>

        {armed && (
          <span className="text-xs font-medium" style={{ color: "#ef4444" }}>
            Agent is halted — kill switch is active
          </span>
        )}

        {error && (
          <span className="text-xs" style={{ color: "#f59e0b" }}>
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
