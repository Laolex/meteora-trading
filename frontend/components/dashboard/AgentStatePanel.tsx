"use client"

import { useState, useEffect } from "react"
import { isAuthenticated, adminToggleLlm } from "@/lib/auth"
import type { AgentState } from "@/lib/api"

interface Props {
  initialState: AgentState
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1.5" style={{ borderBottom: "1px solid #111" }}>
      <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#333", textTransform: "uppercase" }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: "10px", color: accent ? "#14f195" : "#555" }}>
        {value}
      </span>
    </div>
  )
}

export default function AgentStatePanel({ initialState }: Props) {
  const [state, setState] = useState(initialState)
  const [authed, setAuthed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setAuthed(isAuthenticated()) }, [])

  const handleToggle = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await adminToggleLlm(!state.llmEnabled)
      setState(s => ({ ...s, llmEnabled: result.enabled, llmDisabledByOperator: !result.enabled }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }

  const statusColor = state.llmEnabled ? "#14f195" : state.llmDisabledByOperator ? "#f59e0b" : "#333"
  const statusLabel = state.llmEnabled ? "ACTIVE" : state.llmDisabledByOperator ? "DISABLED" : "NO KEY"

  const fmtTime = (v: string | null) =>
    v ? new Date(v).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "—"

  return (
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ LLM TUNER ]</span>
        <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.12em", color: statusColor }}>
          ● {statusLabel}
        </span>
      </div>

      {/* Metrics */}
      <div className="px-4 py-3">
        <Row label="DRIFT THRESHOLD" value={`${state.rebalanceDriftBps} BPS`} />
        <Row label="EXIT VOL" value={`${state.exitVolatilityPct.toFixed(1)}%`} />
        <Row label="BASE RANGE" value={`${state.baseRangeBins} BINS`} />
        <Row label="LAST TUNED" value={fmtTime(state.tunedAt)} />
      </div>

      {/* Reasoning */}
      {state.reasoning && (
        <div className="px-4 pb-3">
          <p className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.04em", color: "#444", fontStyle: "italic", lineHeight: 1.6 }}>
            &ldquo;{state.reasoning}&rdquo;
          </p>
        </div>
      )}

      {/* No key notice */}
      {!state.anthropicKeyConfigured && (
        <div className="px-4 pb-3">
          <p className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.06em", color: "#333" }}>
            SET ANTHROPIC_API_KEY TO ENABLE ADAPTIVE TUNING
          </p>
        </div>
      )}

      {/* Toggle */}
      {authed && state.anthropicKeyConfigured && (
        <div className="px-4 pb-4 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid #111" }}>
          <button
            onClick={() => void handleToggle()}
            disabled={loading}
            className="font-mono transition-colors disabled:opacity-40 mt-3"
            style={{
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "5px 12px",
              border: `1px solid ${state.llmEnabled ? "#f59e0b" : "#14f195"}`,
              color: state.llmEnabled ? "#f59e0b" : "#14f195",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {loading ? "···" : state.llmEnabled ? "[ DISABLE LLM ]" : "[ ENABLE LLM ]"}
          </button>
          {error && (
            <span className="font-mono mt-3" style={{ fontSize: "9px", color: "#f59e0b" }}>
              ERR: {error}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
