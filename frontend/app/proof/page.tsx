import ReceiptsPanel from "@/components/proof/ReceiptsPanel"
import LimitationsBox from "@/components/proof/LimitationsBox"
import { getProofSnapshot } from "@/lib/api"

export const dynamic = "force-dynamic"

export default async function ProofPage() {
  const proof = await getProofSnapshot()

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-4xl mx-auto">
      <div className="mb-12">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f5f5" }}>
          Proof of Operation
        </h1>
        <div className="w-8 h-px mb-3" style={{ background: "#14f195" }} />
        <p className="text-sm" style={{ color: "#888888" }}>
          Receipts. The agent runs. Here&apos;s the evidence.
        </p>
      </div>

      <div className="space-y-10">
        <ReceiptsPanel proof={proof} />
        <LimitationsBox />
      </div>
    </div>
  )
}
