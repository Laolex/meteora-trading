"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import Button from "@/components/ui/Button"

export default function CtaSection() {
  return (
    <section id="cta" className="py-20 md:py-24 px-6 text-center scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, ease }}
        className="max-w-6xl mx-auto rounded-[36px] border border-[rgba(20,241,149,0.1)] bg-[linear-gradient(180deg,rgba(23,28,35,0.58)_0%,rgba(23,28,35,0.46)_100%)] backdrop-blur-[4px] px-6 md:px-10 py-12 md:py-14 md:min-h-[60vh] flex flex-col justify-center"
      >
        <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: "#f5f5f5" }}>
          See it running.
        </h2>
        <p className="text-base mb-9" style={{ color: "#a3a3a3" }}>
          Live dashboard, safety controls, architecture walkthrough, and verifiable receipts.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button href="/dashboard" variant="primary">View Live Dashboard</Button>
          <Button href="/architecture" variant="secondary">Read Architecture</Button>
          <Button href="/proof" variant="ghost">See Proof</Button>
        </div>
      </motion.div>
    </section>
  )
}
