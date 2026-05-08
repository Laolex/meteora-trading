import DiagramSection from "@/components/architecture/DiagramSection"
import BoundaryExplainer from "@/components/architecture/BoundaryExplainer"

export default function ArchitecturePage() {
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
              ARCHITECTURE
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              SYSTEM LAYERS  //  SECURITY BOUNDARIES  //  MODULE MAP
            </div>
          </div>
          <span className="ops-badge">OPS CONSOLE</span>
        </div>
      </div>

      {/* Architecture diagram */}
      <section className="mb-10">
        <div className="term-label mb-3">[ SYSTEM DIAGRAM ]</div>
        <div
          style={{
            border: "1px solid #1e1e1e",
            background: "#0c1117",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "32px 24px",
          }}
        >
          <img
            src="/arch-diagram.svg"
            alt="System architecture diagram"
            style={{ maxWidth: "100%", display: "block" }}
          />
        </div>
      </section>

      <section className="mb-10">
        <div className="term-label mb-3">[ SYSTEM LAYERS ]</div>
        <DiagramSection />
      </section>

      <section className="mb-10">
        <div className="term-label mb-3">[ SECURITY & TRUST BOUNDARIES ]</div>
        <BoundaryExplainer />
      </section>

      {/* Module map */}
      <section>
        <div style={{ border: "1px solid #1e1e1e", background: "#0d0d0d" }}>
          <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
            <span className="term-label">[ MODULE MAP ]</span>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono mb-4" style={{ fontSize: "9px", letterSpacing: "0.04em", color: "#444", lineHeight: 1.7 }}>
              Two AI layers differentiate this agent:{" "}
              <span style={{ color: "#14f195" }}>adaptive range sizing</span> scales bin width from realized
              volatility on every open, and the{" "}
              <span style={{ color: "#14f195" }}>LLM tuner</span> calls Claude Haiku hourly to recalibrate
              drift and exit thresholds based on the current market regime.
            </p>
            <table className="w-full font-mono" style={{ fontSize: "10px" }}>
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
                  <tr key={path} style={{ borderBottom: "1px solid #111" }}>
                    <td className="py-2.5 pr-6 whitespace-nowrap" style={{ color: "#14f195" }}>{path}</td>
                    <td className="py-2.5" style={{ color: "#555" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
