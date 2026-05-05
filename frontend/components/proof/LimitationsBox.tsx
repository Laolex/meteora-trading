import Card from "@/components/ui/Card"

const limitations = [
  "node-helper/index.js is not yet wired to @meteora-ag/dlmm — transactions are simulated only",
  "src/executor/ is a stub — the full tx broadcast → confirmation → retry loop is not implemented",
  "DB writes in DRY_RUN mode are real (actions_log, positions), but tx_signature is always null",
  "Dashboard API (src/dashboard/) is a stub — this frontend currently uses mock data",
  "No mainnet deployment has occurred — all testing on devnet with $0 at risk",
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
        These are the next implementation steps, not unknown risks. The safety and scoring layers are complete.
      </p>
    </Card>
  )
}
