import HeroSection from "@/components/hero/HeroSection"
import ValuePillars from "@/components/landing/ValuePillars"
import FlowAndProof from "@/components/landing/FlowAndProof"
import SafetyBlock from "@/components/landing/SafetyBlock"
import CtaSection from "@/components/landing/CtaSection"
import { getSafetyConfig, getProofSnapshot } from "@/lib/api"

export const revalidate = 60

export default async function Home() {
  const [safety, proof] = await Promise.all([getSafetyConfig(), getProofSnapshot()])

  return (
    <>
      <HeroSection />
      <ValuePillars />
      <FlowAndProof proof={proof} />
      <SafetyBlock safety={safety} />
      <CtaSection />
    </>
  )
}
