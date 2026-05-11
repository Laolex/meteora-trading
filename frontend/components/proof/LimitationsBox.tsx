const limitations = [
  "src/executor/ is an unused skeleton — all on-chain execution flows through node-helper via sendAndConfirmTransaction",
  "DB writes in DRY_RUN mode produce real rows (actions_log, positions) but tx_signature is set to the literal string \"DRY_RUN_SIG\", not a real signature",
  "Dashboard API requires a persistent public host — the Vercel frontend falls back to mock/demo data when NEXT_PUBLIC_API_URL is unset or unreachable",
  "LLM parameter tuner is disabled without ANTHROPIC_API_KEY — the agent runs its built-in scoring logic only",
  "On-chain vault contract is deployed on devnet only; mainnet positions are managed directly via DLMM SDK, not the vault program",
]

export default function LimitationsBox() {
  return (
    <div>
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414", background: "#0d0d0d" }}>
        <div className="flex items-center gap-3">
          <span className="font-mono" style={{ fontSize: "9px", color: "#f59e0b", letterSpacing: "0.12em" }}>!</span>
          <span className="term-label" style={{ color: "#f59e0b60" }}>[ KNOWN LIMITATIONS ]</span>
        </div>
      </div>
      <div className="px-4 py-3" style={{ background: "#0a0a0a" }}>
        {limitations.map((l, i) => (
          <div
            key={i}
            className="flex gap-3 py-2.5"
            style={{ borderBottom: i < limitations.length - 1 ? "1px solid #111" : undefined }}
          >
            <span className="font-mono flex-shrink-0 mt-0.5" style={{ fontSize: "9px", color: "#f59e0b50", letterSpacing: "0.06em" }}>
              —
            </span>
            <p className="font-mono" style={{ fontSize: "10px", color: "#444", letterSpacing: "0.03em", lineHeight: 1.7 }}>
              {l}
            </p>
          </div>
        ))}
        <p className="font-mono mt-3" style={{ fontSize: "9px", color: "#2a2a2a", letterSpacing: "0.04em", lineHeight: 1.7 }}>
          Core is live on Solana mainnet — 2 active SOL-USDC positions, real USDC deployed, real fee collection.
          Safety rails, scoring engine, pool discovery, and DLMM integration are all complete and verified on-chain.
        </p>
      </div>
    </div>
  )
}
