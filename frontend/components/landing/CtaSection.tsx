"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import Button from "@/components/ui/Button"

export default function CtaSection() {
  return (
    <section
      id="cta"
      className="py-28 md:py-40 px-4 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-4xl mx-auto">

        {/* outer shell */}
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={viewportOnce}
          transition={{ duration: 0.9, ease }}
        >
          <div style={{ padding: "1px", background: "#1e1e1e" }}>
            {/* inner core */}
            <div
              className="relative overflow-hidden px-6 md:px-12 py-12 md:py-20"
              style={{
                background: "#0d0d0d",
                border: "1px solid #141414",
              }}
            >
              <span
                className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-medium mb-8"
                style={{ background: "#0a0a0a", color: "#14f195", border: "1px solid #1e1e1e" }}
              >
                <span className="w-1 h-1" style={{ background: "#14f195" }} />
                Open source
              </span>

              <h2
                className="font-mono uppercase font-black mb-6 relative text-4xl sm:text-5xl md:text-6xl"
                style={{ color: "#f0f0f0", letterSpacing: "-0.035em", lineHeight: 1.02 }}
              >
                See it running.
              </h2>

              <p
                className="text-base mb-10 max-w-2xl relative"
                style={{ color: "#7a7a7a", lineHeight: 1.7 }}
              >
                Live dashboard, safety controls, architecture walkthrough, and verifiable receipts.
              </p>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 relative">
                <Button href="/dashboard" variant="primary" className="!rounded-none uppercase tracking-[0.08em]">View Live Dashboard</Button>
                <Button href="/architecture" variant="secondary" className="!rounded-none uppercase tracking-[0.08em]">Read Architecture</Button>
                <Button href="/proof" variant="ghost" className="!rounded-none uppercase tracking-[0.08em] !text-[#f5f5f5] border border-[#1e1e1e]">See Proof</Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
