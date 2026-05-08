import HeroSection from "@/components/hero/HeroSection"
import PoolVisualSection from "@/components/landing/PoolVisualSection"
import ValuePillars from "@/components/landing/ValuePillars"
import HowItWorks from "@/components/landing/HowItWorks"
import SafetyBlock from "@/components/landing/SafetyBlock"
import ProofBlock from "@/components/landing/ProofBlock"
import CtaSection from "@/components/landing/CtaSection"
import { getSafetyConfig, getProofSnapshot } from "@/lib/api"

export const revalidate = 60

export default async function Home() {
  const [safety, proof] = await Promise.all([getSafetyConfig(), getProofSnapshot()])

  return (
    <>
      <HeroSection />
      <PoolVisualSection />
      <ValuePillars />
      <HowItWorks />
      <ProofBlock proof={proof} />
      <SafetyBlock safety={safety} />
      <CtaSection />
    </>
  )
}
