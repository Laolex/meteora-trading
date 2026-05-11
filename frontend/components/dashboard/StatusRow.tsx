import type { AgentStatus } from "@/lib/api"
import InlineBalance from "@/components/dashboard/InlineBalance"

export default function StatusRow({ status }: { status: AgentStatus }) {
  const isLive = status.mode !== "DRY_RUN"
  const svcOk = status.serviceStatus === "active"

  return (
    <div
      className="flex flex-wrap text-xs font-mono"
      style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}
    >
      {/* Mode */}
      <div className="flex items-center px-4 py-2" style={{ borderRight: "1px solid #1e1e1e" }}>
        <span
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{
            background: isLive ? "#14f195" : "#f59e0b",
            boxShadow: isLive ? "0 0 5px #14f195" : "0 0 5px #f59e0b",
            flexShrink: 0,
          }}
        />
        <span style={{ color: isLive ? "#14f195" : "#f59e0b", letterSpacing: "0.12em" }}>
          {status.mode}
        </span>
      </div>

      {/* Network */}
      <div className="flex items-center px-4 py-2" style={{ borderRight: "1px solid #1e1e1e" }}>
        <span style={{ color: "#555", letterSpacing: "0.1em" }}>{status.network.toUpperCase()}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Balance */}
      <div
        className="flex items-center px-4 py-2"
        style={{ borderLeft: "1px solid #1e1e1e", borderRight: "1px solid #1e1e1e", fontSize: "9px", letterSpacing: "0.08em" }}
      >
        <InlineBalance compact />
      </div>

      {/* Service */}
      <div
        className="flex items-center px-4 py-2"
        style={{ borderRight: status.killSwitchPresent ? "1px solid #1e1e1e" : undefined }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{ background: svcOk ? "#14f195" : "#e61919", flexShrink: 0 }}
        />
        <span style={{ color: svcOk ? "#555" : "#e61919", letterSpacing: "0.1em" }}>
          SVC {status.serviceStatus.toUpperCase()}
        </span>
      </div>

      {/* Agent on/off */}
      <div className="flex items-center px-4 py-2" style={{ background: status.killSwitchPresent ? "rgba(230,25,25,0.07)" : "rgba(20,241,149,0.05)" }}>
        <span
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{ background: status.killSwitchPresent ? "#e61919" : "#14f195", flexShrink: 0 }}
        />
        <span style={{ color: status.killSwitchPresent ? "#e61919" : "#14f195", letterSpacing: "0.12em" }}>
          AGENT {status.killSwitchPresent ? "OFF" : "ON"}
        </span>
      </div>
    </div>
  )
}
