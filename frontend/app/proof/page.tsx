import ReceiptsPanel from "@/components/proof/ReceiptsPanel"
import LimitationsBox from "@/components/proof/LimitationsBox"
import { getProofSnapshot } from "@/lib/api"

export const dynamic = "force-dynamic"

export default async function ProofPage() {
  const proof = await getProofSnapshot()

  return (
    <div className="crt-scanlines min-h-screen pt-24 pb-16 px-4 md:px-6 max-w-4xl mx-auto">
      {/* Terminal header */}
      <div className="mb-8" style={{ borderBottom: "1px solid #1e1e1e", paddingBottom: "16px" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1
              className="font-mono font-black leading-none mb-1"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "#eaeaea", textTransform: "uppercase" }}
            >
              PROOF OF OPERATION
            </h1>
            <div className="font-mono" style={{ fontSize: "9px", letterSpacing: "0.15em", color: "#333", textTransform: "uppercase" }}>
              RECEIPTS  //  GIT LOG  //  ACTIONS LOG  //  KNOWN LIMITATIONS
            </div>
          </div>
          <span className="ops-badge">OPS CONSOLE</span>
        </div>
      </div>

      <div className="space-y-0" style={{ border: "1px solid #1e1e1e" }}>
        <ReceiptsPanel proof={proof} />
        <LimitationsBox />
      </div>
    </div>
  )
}
