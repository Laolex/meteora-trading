import Card from "@/components/ui/Card"

const limitations = [
  "src/executor/ tx confirmation + retry loop is not yet complete — decisions route through node-helper → @meteora-ag/dlmm but broadcast hardening is in progress",
  "DB writes in DRY_RUN mode are real (actions_log, positions), but tx_signature is always null in dry-run",
  "Dashboard API requires a persistent host — ngrok works for demos but restarts on process restart",
  "On-chain vault is deployed and live on devnet — no mainnet deployment has occurred; all capital at risk is $0",
]

export default function LimitationsBox() {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: "#f59e0b" }}
        />
        <h2 className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
          Current limitations (honest)
        </h2>
      </div>
      <ul className="space-y-3">
        {limitations.map((l) => (
          <li key={l} className="flex gap-3 text-sm">
            <span style={{ color: "#333333" }} aria-hidden>—</span>
            <span style={{ color: "#888888" }}>{l}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs mt-4" style={{ color: "#444444" }}>
        The safety rails, scoring engine, discovery loop, node-helper DLMM integration, and on-chain vault are all complete. The remaining work is tx confirmation hardening and a persistent production host.
      </p>
    </Card>
  )
}
