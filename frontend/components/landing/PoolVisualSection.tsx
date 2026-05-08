"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import PoolVisual from "@/components/hero/PoolVisual"
import Logo from "@/components/ui/Logo"

export default function PoolVisualSection() {
  return (
    <section
      className="py-14 md:py-18 px-6 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5 }}
          className="text-center text-xs font-mono uppercase tracking-widest mb-6"
          style={{ color: "#14f195" }}
        >
          Live DLMM position
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.8, ease }}
          className="rounded-2xl px-6 pt-6 pb-5"
          style={{
            border: "1px solid rgba(20,241,149,0.1)",
            background: "rgba(10,15,13,0.5)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <Logo size={22} />
            <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: "#14f195" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: "#14f195", boxShadow: "0 0 5px #14f195", animation: "pulse 2s infinite" }}
              />
              devnet · DRY_RUN active
            </span>
          </div>
          <PoolVisual />
        </motion.div>
      </div>
    </section>
  )
}
