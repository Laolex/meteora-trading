import HeroSection from "@/components/hero/HeroSection"
import ValuePillars from "@/components/landing/ValuePillars"
import HowItWorks from "@/components/landing/HowItWorks"
import SafetyBlock from "@/components/landing/SafetyBlock"
import ProofBlock from "@/components/landing/ProofBlock"
import CtaSection from "@/components/landing/CtaSection"

export default function Home() {
  return (
    <>
      <HeroSection />
      <ValuePillars />
      <HowItWorks />
      <ProofBlock />
      <SafetyBlock />
      <CtaSection />
    </>
  )
}
