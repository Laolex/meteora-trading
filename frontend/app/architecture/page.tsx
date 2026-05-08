import DiagramSection from "@/components/architecture/DiagramSection"
import BoundaryExplainer from "@/components/architecture/BoundaryExplainer"

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="mb-14">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f5" }}>
          Architecture
        </h1>
        <div className="w-8 h-px mb-3" style={{ background: "#14f195" }} />
        <p className="text-sm" style={{ color: "#888888" }}>
          How the agent is structured, what talks to what, and where each safety boundary lives.
        </p>
      </div>

      {/* AI-generated architecture diagram */}
      <section className="mb-10">
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(20,241,149,0.1)" }}>
          <img
            src="/arch-diagram.svg"
            alt="System architecture diagram"
            className="w-full block"
            style={{ background: "#0c1117" }}
          />
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-8 text-center" style={{ color: "#888888" }}>
          System layers
        </h2>
        <DiagramSection />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-8" style={{ color: "#888888" }}>
          Security & trust boundaries
        </h2>
        <BoundaryExplainer />
      </section>

      <section className="mt-16">
        <div
          className="rounded-2xl p-6"
          style={{ background: "#111111", border: "1px solid #222222" }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "#888888" }}>
            Module map
          </h2>
          <p className="text-xs mb-5" style={{ color: "#555555" }}>
            Two AI layers differentiate this agent:{" "}
            <span style={{ color: "#14f195" }}>adaptive range sizing</span> scales bin width from realized
            volatility on every open, and the{" "}
            <span style={{ color: "#14f195" }}>LLM tuner</span> calls Claude Haiku hourly to recalibrate
            drift and exit thresholds based on the current market regime.
          </p>
          <table className="w-full text-sm font-mono">
            <tbody>
              {[
                ["src/discovery/", "Pull pools from Meteora API, score and rank by fee yield"],
                ["src/rebalance/decision.py", "Core decision tree: HOLD / CLAIM / REBALANCE / EXIT"],
                ["src/rebalance/adaptive.py", "Volatility-driven bin-width — tight in low vol, wide in high vol"],
                ["src/rebalance/tuner.py", "LLM parameter tuner — Claude Haiku adjusts thresholds hourly"],
                ["src/rebalance/memo.py", "On-chain receipts via SPL Memo — every action verifiable on explorer"],
                ["src/rebalance/guards.py", "Safety rails — size, deployed, daily loss, kill switch"],
                ["src/position/", "Read position state, open/close via node-helper"],
                ["src/db/", "Postgres persistence — asyncpg pool, full CRUD + fee accumulation"],
                ["src/dashboard/", "FastAPI — positions, actions, vault, LLM tuner state"],
                ["node-helper/", "Signs and broadcasts Meteora DLMM SDK transactions on Solana"],
                ["sql/", "Schema migrations"],
              ].map(([path, desc]) => (
                <tr key={path} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td className="py-2.5 pr-6" style={{ color: "#14f195" }}>{path}</td>
                  <td className="py-2.5" style={{ color: "#888888" }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
