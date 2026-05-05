import type { ActivityItem } from "@/lib/api"
import Badge from "@/components/ui/Badge"

function actionColor(type: string): "green" | "amber" | "red" | "neutral" | "blue" {
  const map: Record<string, "green" | "amber" | "red" | "neutral" | "blue"> = {
    open: "green",
    close: "neutral",
    rebalance: "blue",
    claim: "amber",
    exit: "red",
  }
  return map[type] ?? "neutral"
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #222222" }}>
      <div
        className="px-4 py-3 text-xs font-medium uppercase tracking-wider"
        style={{ borderBottom: "1px solid #222222", color: "#888888", background: "#111111" }}
      >
        Recent Activity
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
              {["Time", "Pool", "Action", "Reason", "Tx"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium"
                  style={{ color: "#444444", background: "#0d0d0d" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: "1px solid #111111", background: "#0a0a0a" }}
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#888888" }}>
                  {fmtTime(item.decidedAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#f5f5f5" }}>
                  {item.poolName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant={actionColor(item.actionType)}>{item.actionType}</Badge>
                </td>
                <td className="px-4 py-3 text-xs max-w-xs" style={{ color: "#888888" }}>
                  {item.reason}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "#444444" }}>
                  {item.txSignature ? (
                    <span style={{ color: "#14f195" }}>{item.txSignature.slice(0, 8)}…</span>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
