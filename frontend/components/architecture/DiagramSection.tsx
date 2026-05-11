const layers = [
  { label: "FRONTEND", nodes: ["Next.js Dashboard"], color: "#14f195" },
  { label: "API", nodes: ["FastAPI (src/dashboard/)"], color: "#60a5fa" },
  { label: "AGENT CORE", nodes: ["Discovery", "Scorer", "Decision Engine", "Risk Guard", "Position Manager"], color: "#f59e0b" },
  { label: "EXECUTION", nodes: ["Node Helper (Meteora SDK)", "Hot Wallet Signer"], color: "#a78bfa" },
  { label: "INFRASTRUCTURE", nodes: ["Solana RPC (Helius)", "Postgres"], color: "#888888" },
]

export default function DiagramSection() {
  return (
    <div style={{ border: "1px solid #1e1e1e" }}>
      {layers.map(({ label, nodes, color }, i) => (
        <div
          key={label}
          className="px-4 py-3 flex flex-wrap items-center gap-4"
          style={{
            borderBottom: i < layers.length - 1 ? "1px solid #111" : undefined,
            borderLeft: `3px solid ${color}`,
            background: "#0d0d0d",
          }}
        >
          <span
            className="font-mono flex-shrink-0"
            style={{ fontSize: "9px", letterSpacing: "0.12em", color, width: "7rem" }}
          >
            {label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {nodes.map((n) => (
              <span
                key={n}
                className="font-mono"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.04em",
                  color: "#555",
                  border: "1px solid #1e1e1e",
                  padding: "2px 7px",
                }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
