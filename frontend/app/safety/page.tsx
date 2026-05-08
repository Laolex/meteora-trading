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
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f5" }}>
          Safety & Controls
        </h1>
        <div className="w-8 h-px mb-3" style={{ background: "#14f195" }} />
        <p className="text-sm" style={{ color: "#888888" }}>
          Every guard that stands between the agent and real capital.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ControlsPanel config={config} />
        </div>
        <div className="space-y-6">
          <Checklist safety={config} wallet={wallet} dbReachable={proof.dbReachable} />
          <RollbackBlock />
        </div>
      </div>
    </div>
  )
}
