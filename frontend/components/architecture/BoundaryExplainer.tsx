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
    <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
      {boundaries.map(({ q, a }, i) => (
        <div
          key={q}
          className="px-4 py-4"
          style={{ borderBottom: i < boundaries.length - 1 ? "1px solid #111" : undefined }}
        >
          <div
            className="font-mono mb-2"
            style={{ fontSize: "10px", color: "#14f195", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Q: {q}
          </div>
          <p
            className="font-mono"
            style={{ fontSize: "10px", letterSpacing: "0.03em", color: "#555", lineHeight: 1.75 }}
          >
            {a}
          </p>
        </div>
      ))}
    </div>
  )
}
