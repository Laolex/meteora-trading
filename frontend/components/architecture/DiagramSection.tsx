"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"

const layers = [
  {
    label: "Frontend",
    nodes: ["Next.js Dashboard"],
    color: "#14f195",
  },
  {
    label: "API",
    nodes: ["FastAPI (src/dashboard/)"],
    color: "#60a5fa",
  },
  {
    label: "Agent Core",
    nodes: ["Discovery", "Scorer", "Decision Engine", "Risk Guard", "Position Manager"],
    color: "#f59e0b",
  },
  {
    label: "Execution",
    nodes: ["Node Helper (Meteora SDK)", "Hot Wallet Signer"],
    color: "#a78bfa",
  },
  {
    label: "Infrastructure",
    nodes: ["Solana RPC (Helius)", "Postgres"],
    color: "#888888",
  },
]

export default function DiagramSection() {
  return (
    <div className="space-y-2 max-w-2xl mx-auto">
      {layers.map(({ label, nodes, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, ease, delay: i * 0.08 }}
        >
          <div
            className="rounded-xl p-4"
            style={{ background: "#111111", border: `1px solid ${color}22` }}
          >
            <p className="text-xs uppercase tracking-widest mb-3 font-medium" style={{ color }}>
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {nodes.map((n) => (
                <span
                  key={n}
                  className="text-xs px-3 py-1.5 rounded-lg font-mono"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          {i < layers.length - 1 && (
            <div className="flex justify-center my-1">
              <div className="w-px h-4" style={{ background: "#333" }} />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  )
}
