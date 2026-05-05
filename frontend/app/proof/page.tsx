import ReceiptsPanel from "@/components/proof/ReceiptsPanel"
import LimitationsBox from "@/components/proof/LimitationsBox"

export default function ProofPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f5" }}>
          Proof of Operation
        </h1>
        <p className="text-sm" style={{ color: "#888888" }}>
          Receipts. The agent runs. Here's the evidence.
        </p>
      </div>

      <div className="space-y-10">
        <ReceiptsPanel />
        <LimitationsBox />
      </div>
    </div>
  )
}
