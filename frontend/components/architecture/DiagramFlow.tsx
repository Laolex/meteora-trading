"use client"

import { motion } from "motion/react"

// ── node definitions ─────────────────────────────────────────────────────────

const LAYERS = [
  {
    id: "frontend",
    label: "FRONTEND",
    nodes: ["Next.js Dashboard"],
    color: "#14f195",
    col: "main",
  },
  {
    id: "api",
    label: "API",
    nodes: ["FastAPI  /  src/dashboard/"],
    color: "#60a5fa",
    col: "main",
  },
  {
    id: "core",
    label: "AGENT CORE",
    nodes: ["Discovery", "Scorer", "Decision Engine", "Risk Guard", "Position Manager"],
    color: "#f59e0b",
    col: "main",
  },
  {
    id: "exec",
    label: "EXECUTION",
    nodes: ["Node Helper (Meteora SDK)", "Hot Wallet Signer"],
    color: "#a78bfa",
    col: "main",
  },
  {
    id: "rpc",
    label: "INFRASTRUCTURE",
    nodes: ["Solana RPC (Helius)", "Postgres"],
    color: "#888888",
    col: "main",
  },
]

const SATELLITES = [
  {
    id: "llm",
    label: "LLM TUNER",
    nodes: ["Claude Haiku", "Hourly recalibration"],
    color: "#f472b6",
    attachTo: "core",
    side: "right" as const,
    note: "adjusts drift & vol thresholds",
  },
]

// ── helpers ──────────────────────────────────────────────────────────────────

function FlowDot({ color, delay = 0, vertical = true }: { color: string; delay?: number; vertical?: boolean }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: vertical ? "3px" : "3px",
        height: vertical ? "3px" : "3px",
        background: color,
        borderRadius: "50%",
        boxShadow: `0 0 4px ${color}`,
        top: vertical ? undefined : "50%",
        left: vertical ? "50%" : undefined,
        transform: vertical ? "translateX(-50%)" : "translateY(-50%)",
      }}
      animate={vertical
        ? { top: ["0%", "100%"] }
        : { left: ["0%", "100%"] }
      }
      transition={{
        duration: 1.4,
        repeat: Infinity,
        ease: "linear",
        delay,
      }}
    />
  )
}

function Connector({ color, height = 40 }: { color: string; height?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: "1px",
        height,
        background: `${color}30`,
        margin: "0 auto",
        overflow: "visible",
      }}
    >
      <FlowDot color={color} />
      <FlowDot color={color} delay={0.7} />
    </div>
  )
}

function Node({
  layer,
  index,
}: {
  layer: typeof LAYERS[number]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      <div
        style={{
          border: `1px solid ${layer.color}40`,
          borderLeft: `3px solid ${layer.color}`,
          background: "#0d0d0d",
          padding: "12px 16px",
          position: "relative",
        }}
      >
        {/* Pulse dot */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: layer.color,
            boxShadow: `0 0 6px ${layer.color}`,
          }}
        />

        {/* Label */}
        <div
          className="font-mono mb-2"
          style={{ fontSize: "8px", letterSpacing: "0.2em", color: layer.color, textTransform: "uppercase" }}
        >
          {layer.label}
        </div>

        {/* Nodes */}
        <div className="flex flex-wrap gap-1.5">
          {layer.nodes.map((n) => (
            <span
              key={n}
              className="font-mono"
              style={{
                fontSize: "9px",
                letterSpacing: "0.04em",
                color: "#666",
                border: "1px solid #1e1e1e",
                padding: "2px 7px",
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function DiagramFlow() {
  const llm = SATELLITES[0]

  return (
    <div
      style={{
        border: "1px solid #1e1e1e",
        background: "#080808",
        padding: "32px 24px",
      }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Main column + LLM satellite */}
        <div className="relative">

          {/* LLM Tuner satellite — floats to the right of Agent Core */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="hidden md:block absolute"
            style={{ right: "-220px", top: "196px", width: "190px" }}
          >
            {/* Horizontal connector line */}
            <div
              style={{
                position: "absolute",
                left: "-32px",
                top: "28px",
                width: "32px",
                height: "1px",
                background: `${llm.color}30`,
                overflow: "hidden",
              }}
            >
              <FlowDot color={llm.color} delay={0.3} vertical={false} />
              <FlowDot color={llm.color} delay={1} vertical={false} />
            </div>

            <div
              style={{
                border: `1px solid ${llm.color}40`,
                borderLeft: `3px solid ${llm.color}`,
                background: "#0d0d0d",
                padding: "10px 12px",
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: llm.color,
                  boxShadow: `0 0 6px ${llm.color}`,
                  float: "right",
                  marginTop: 2,
                }}
              />
              <div className="font-mono mb-1.5" style={{ fontSize: "8px", letterSpacing: "0.2em", color: llm.color }}>
                {llm.label}
              </div>
              {llm.nodes.map((n) => (
                <span
                  key={n}
                  className="font-mono block"
                  style={{ fontSize: "9px", color: "#555", letterSpacing: "0.03em" }}
                >
                  {n}
                </span>
              ))}
              <div className="font-mono mt-2" style={{ fontSize: "8px", color: "#333", letterSpacing: "0.03em", fontStyle: "italic" }}>
                {llm.note}
              </div>
            </div>
          </motion.div>

          {/* Main flow stack */}
          <div className="space-y-0">
            {LAYERS.map((layer, i) => (
              <div key={layer.id}>
                <Node layer={layer} index={i} />
                {i < LAYERS.length - 1 && (
                  <Connector
                    color={LAYERS[i + 1].color}
                    height={32}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div
          className="mt-8 flex flex-wrap gap-4"
          style={{ borderTop: "1px solid #111", paddingTop: "16px" }}
        >
          {[...LAYERS, { id: "llm2", label: "LLM TUNER", color: "#f472b6" }].map(({ id, label, color }) => (
            <div key={id} className="flex items-center gap-1.5">
              <div style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
              <span className="font-mono" style={{ fontSize: "7px", letterSpacing: "0.14em", color: "#333", textTransform: "uppercase" }}>
                {label}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: "#14f195", boxShadow: "0 0 4px #14f195" }}
            />
            <span className="font-mono" style={{ fontSize: "7px", letterSpacing: "0.14em", color: "#333" }}>LIVE DATA FLOW</span>
          </div>
        </div>
      </div>
    </div>
  )
}
