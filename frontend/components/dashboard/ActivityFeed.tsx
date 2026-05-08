"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
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
    timeZone: "UTC",
  }) + " UTC"
}

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, ease }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid #222222" }}
    >
      <div
        className="px-4 py-3 text-xs font-medium uppercase tracking-wider"
        style={{ borderBottom: "1px solid #222222", color: "#555555", background: "#111111" }}
      >
        Recent Activity
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
              {["Time", "Pool", "Action", "Reason", "Result", "Tx"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium"
                  style={{ color: "#444444", background: "#111111" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.35, delay: i * 0.04, ease }}
                whileHover={{ backgroundColor: "rgba(20,241,149,0.03)" }}
                style={{ borderBottom: "1px solid #1a1a1a", backgroundColor: "#111111" }}
              >
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#666666" }}>
                  {fmtTime(item.decidedAt)}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap" style={{ color: "#f5f5f5" }}>
                  {item.poolName}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant={actionColor(item.actionType)}>{item.actionType}</Badge>
                </td>
                <td className="px-4 py-3 text-xs max-w-xs" style={{ color: "#666666" }}>
                  {item.reason}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {item.success === true && <Badge variant="green">ok</Badge>}
                  {item.success === false && <Badge variant="red">failed</Badge>}
                  {item.success === null && <Badge variant="amber">pending</Badge>}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "#444444" }}>
                  {item.txSignature ? (
                    <span style={{ color: "#14f195" }}>{item.txSignature.slice(0, 8)}…</span>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
