"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import Button from "@/components/ui/Button"

export default function CtaSection() {
  return (
    <section
      id="cta"
      className="py-24 md:py-32 px-6 text-center scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, ease }}
        className="max-w-2xl mx-auto"
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
