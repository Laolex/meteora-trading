import { getSafetyConfig, getWalletBalance, getProofSnapshot } from "@/lib/api"
import ControlsPanel from "@/components/safety/ControlsPanel"
import Checklist from "@/components/safety/Checklist"
import RollbackBlock from "@/components/safety/RollbackBlock"

export const dynamic = "force-dynamic"

export default async function SafetyPage() {
  const [config, wallet, proof] = await Promise.all([
    getSafetyConfig(),
    getWalletBalance(),
    getProofSnapshot(),
  ])

  return (
    <div className="crt-scanlines min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-5xl mx-auto">
      {/* Terminal header */}
      <div className="mb-8" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "16px" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-mono font-black leading-none mb-1"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "#eaeaea", textTransform: "uppercase" }}
            >
              SAFETY & CONTROLS
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              RUNTIME CONTROLS  //  HARD LIMITS  //  INCIDENT PROCEDURE
            </div>
          </div>
          <span className="ops-badge">OPS CONSOLE</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2" style={{ gap: "1px", background: "#1e1e1e" }}>
        <div style={{ background: "#0A0A0A" }}>
          <ControlsPanel config={config} />
        </div>
        <div style={{ background: "#0A0A0A" }}>
          <Checklist safety={config} wallet={wallet} dbReachable={proof.dbReachable} />
          <div style={{ borderTop: "1px solid #1e1e1e" }}>
            <RollbackBlock />
          </div>
        </div>
      </div>
    </div>
  )
}
