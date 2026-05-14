const limitations = [
  "src/executor/ is an unused skeleton — TX confirmation and retry are handled directly in node-helper via sendAndConfirmTransaction; the executor layer was superseded before use",
  "Positions that trip the circuit breaker (5 consecutive failures) are skipped until manual reset — no automatic recovery; operator must clear the failure state via service restart or direct intervention",
  "Dashboard panels are authenticated server snapshots, not a realtime stream. Values refresh on page reload or when operators trigger the dashboard REFRESH control",
  "On-chain vault is deployed and live on devnet — no mainnet vault deployment has occurred; all LP capital is managed directly from the operator wallet",
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
          The safety rails, scoring engine, discovery loop, node-helper DLMM integration, and vault plumbing are implemented.
          Remaining work: mainnet vault deployment and operational tuning for real-capital execution.
        </p>
      </div>
    </div>
  )
}
