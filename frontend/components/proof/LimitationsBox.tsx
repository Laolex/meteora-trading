const limitations = [
  "TX confirmation + retry is handled in node-helper via sendAndConfirmTransaction — broadcast hardening is complete; src/executor/ is an unused skeleton",
  "DB writes in DRY_RUN mode are real (actions_log, positions), but tx_signature is set to the placeholder string \"DRY_RUN_SIG\" rather than a real signature",
  "Dashboard API requires a persistent public host — a stable domain or VPS is needed for production; process restarts change the URL if using tunnels",
  "On-chain vault is deployed and live on devnet — no mainnet deployment has occurred; all capital at risk is $0",
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
          The safety rails, scoring engine, discovery loop, node-helper DLMM integration, and on-chain vault are all complete.
          Remaining work: a persistent production host for the dashboard API.
        </p>
      </div>
    </div>
  )
}
