import DiagramSection from "@/components/architecture/DiagramSection"
import BoundaryExplainer from "@/components/architecture/BoundaryExplainer"

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-5xl mx-auto">
      <div className="mb-14">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f5" }}>
          Architecture
        </h1>
        <p className="text-sm" style={{ color: "#888888" }}>
          How the agent is structured, what talks to what, and where each safety boundary lives.
        </p>
      </div>

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
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
            Module map
          </h2>
          <table className="w-full text-sm font-mono">
            <tbody>
              {[
                ["src/discovery/", "Pull pools, score, rank via Meteora API"],
                ["src/rebalance/", "Decision logic + safety guards"],
                ["src/position/", "Read position state, open/close via node-helper"],
                ["src/executor/", "Reserved — tx executor integration (stub)"],
                ["src/db/", "Reserved — Postgres persistence (stub)"],
                ["src/dashboard/", "Reserved — FastAPI for this frontend (stub)"],
                ["node-helper/", "Signs and broadcasts Meteora SDK transactions"],
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
