"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce } from "@/lib/motion"
import Card from "@/components/ui/Card"

const boundaries = [
  {
    q: "What signs transactions?",
    a: "The hot wallet keypair loaded by node-helper. The Python orchestrator never touches private keys — it calls node-helper over stdio with unsigned transaction data.",
  },
  {
    q: "Where do funds live?",
    a: "On-chain, in the LP position. The agent holds no funds. The hot wallet holds only enough SOL for gas fees. Liquidity is deposited directly into Meteora DLMM bins.",
  },
  {
    q: "What blocks unsafe execution?",
    a: "Four layers: DRY_RUN flag (no tx sent), kill switch file (immediate halt), position cap check (hard limit before open), and daily loss guard (halt if loss exceeds threshold).",
  },
]

export default function BoundaryExplainer() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      className="grid md:grid-cols-3 gap-6"
    >
      {boundaries.map(({ q, a }) => (
        <motion.div key={q} variants={cardReveal}>
          <Card className="h-full">
            <p className="text-sm font-semibold mb-3" style={{ color: "#14f195" }}>{q}</p>
            <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>{a}</p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
