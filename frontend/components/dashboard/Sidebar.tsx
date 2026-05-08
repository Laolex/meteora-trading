import Link from "next/link"
import type { AgentStatus, KpiSummary, RiskUtilization, SafetyConfig } from "@/lib/api"

interface DashboardSidebarProps {
  status: AgentStatus
  kpi: KpiSummary
  risk: RiskUtilization
  safety: SafetyConfig
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-2" style={{ borderBottom: "1px solid #111" }}>
      <span className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#555", textTransform: "uppercase" }}>
        {label}
      </span>
      <span className="font-mono" style={{ fontSize: "10px", color: accent ? "#14f195" : "#555" }}>
        {value}
      </span>
    </div>
  )
}

export default function DashboardSidebar({ status, kpi, risk, safety }: DashboardSidebarProps) {
  return (
    <aside>
      {/* Session block */}
      <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
          <span className="term-label">[ SESSION ]</span>
        </div>
        <div className="px-4 py-3">
          <Row label="MODE" value={status.mode} accent={status.mode !== "DRY_RUN"} />
          <Row label="NETWORK" value={status.network.toUpperCase()} />
          <Row label="POSITIONS" value={`${kpi.openPositions} / ${safety.maxOpenPositions}`} />
          <Row label="LOSS CAP" value={`${safety.dailyLossLimitPct}%`} />
          <Row label="POS UTIL" value={`${risk.positionUtilPct.toFixed(0)}%`} />
        </div>
      </div>

      {/* Nav block */}
      <div style={{ border: "1px solid #1e1e1e", borderTop: "none", background: "#0d0d0d" }}>
        <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
          <span className="term-label">[ NAVIGATE ]</span>
        </div>
        <nav className="py-1">
          {[
            { href: "/dashboard", label: "OVERVIEW" },
            { href: "/safety", label: "SAFETY CONTROLS" },
            { href: "/architecture", label: "ARCHITECTURE" },
            { href: "/proof", label: "PROOF OF OPERATION" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block px-4 py-2 font-mono transition-colors hover:text-[#14f195]"
              style={{ fontSize: "9px", letterSpacing: "0.12em", color: "#444", textTransform: "uppercase" }}
            >
              &gt;&gt; {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
