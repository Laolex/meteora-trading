"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import Button from "@/components/ui/Button"

export default function CtaSection() {
  return (
    <section
      id="cta"
      className="py-28 md:py-40 px-4 text-center scroll-mt-24"
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
          <div
            style={{
              padding: "6px",
              borderRadius: "2.5rem",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
            }}
          >
            {/* inner core */}
            <div
              className="relative overflow-hidden px-8 md:px-16 py-16 md:py-24"
              style={{
                borderRadius: "calc(2.5rem - 6px)",
                background: "linear-gradient(160deg, rgba(14,20,28,0.96) 0%, rgba(10,16,24,0.9) 100%)",
                border: "1px solid rgba(20,241,149,0.08)",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06)",
              }}
            >
              {/* ambient glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(20,241,149,0.07) 0%, transparent 70%)",
                }}
                aria-hidden
              />

              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] font-medium mb-8"
                style={{ background: "rgba(20,241,149,0.08)", color: "#14f195", border: "1px solid rgba(20,241,149,0.15)" }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: "#14f195" }} />
                Open source
              </span>

              <h2
                className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 relative"
                style={{ color: "#f0f0f0", letterSpacing: "-0.035em", lineHeight: 1.04 }}
              >
                See it running.
              </h2>

              <p
                className="text-base md:text-lg mb-10 max-w-lg mx-auto relative"
                style={{ color: "#555", lineHeight: 1.7 }}
              >
                Live dashboard, safety controls, architecture walkthrough, and verifiable receipts.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 relative">
                <Button href="/dashboard" variant="primary">View Live Dashboard</Button>
                <Button href="/architecture" variant="secondary">Read Architecture</Button>
                <Button href="/proof" variant="ghost">See Proof</Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
