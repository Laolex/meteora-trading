import type { AgentStatus } from "@/lib/api"
import Badge from "@/components/ui/Badge"

function truncate(key: string) {
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}

export default function StatusRow({ status }: { status: AgentStatus }) {
  const serviceColor = status.serviceStatus === "active" ? "green" : "red"
  const modeColor = status.mode === "DRY_RUN" ? "amber" : "green"

  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl text-sm"
      style={{ background: "#111111", border: "1px solid #222222" }}
    >
      <Badge variant={modeColor} dot>{status.mode}</Badge>
      <span style={{ color: "#444444" }}>·</span>
      <Badge variant="neutral">{status.network}</Badge>
      <span style={{ color: "#444444" }}>·</span>
      <span className="font-mono text-xs" style={{ color: "#888888" }}>
        {truncate(status.walletPubkey)}
      </span>
      <span style={{ color: "#444444" }}>·</span>
      <Badge variant={serviceColor} dot>
        service {status.serviceStatus}
      </Badge>
      {status.killSwitchPresent && (
        <>
          <span style={{ color: "#444444" }}>·</span>
          <Badge variant="red" dot>kill switch armed</Badge>
        </>
      )}
    </div>
  )
}
