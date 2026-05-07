"use client"

import { motion } from "motion/react"
import { viewportOnce, ease } from "@/lib/motion"
import ParticleCanvas from "@/components/hero/ParticleCanvas"

const steps = [
  {
    n: "01",
    title: "Discover Pools",
    description: "Pull the full Meteora DLMM universe via API. Filter by liquidity, age, and token quality.",
  },
  {
    n: "02",
    title: "Score & Decide",
    description: "Rank by a weighted composite: fees/24h, volume/TVL, bin liquidity depth, token quality.",
  },
  {
    n: "03",
    title: "Risk Gate",
    description: "Check kill switch, position caps, total deployment limit, and daily loss guard before any execution.",
  },
  {
    n: "04",
    title: "Execute & Monitor",
    description: "Hot wallet signs via node-helper. Every action logs to Postgres. Rebalances if price drifts.",
  },
]

export default function HowItWorks() {
  return (
    <section
      id="flow"
      className="relative py-20 md:py-24 px-6 scroll-mt-24 overflow-hidden"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <ParticleCanvas />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 56% 50% at 50% 15%, rgba(20,241,149,0.07) 0%, rgba(20,241,149,0.025) 42%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto rounded-[36px] border border-[rgba(20,241,149,0.1)] bg-[linear-gradient(180deg,rgba(23,28,35,0.58)_0%,rgba(23,28,35,0.46)_100%)] backdrop-blur-[4px] px-6 md:px-10 py-12 md:py-14 md:min-h-[68vh] flex flex-col justify-center">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
          style={{ color: "#f5f5f5" }}
        >
          How it works
        </motion.h2>

        <div className="grid md:grid-cols-4 gap-5">
          {steps.map(({ n, title, description }, i) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease, delay: i * 0.1 }}
              className="relative flex flex-col px-6 py-7 rounded-3xl"
              style={{
                background: "linear-gradient(180deg, rgba(23,28,35,0.78) 0%, rgba(23,28,35,0.62) 100%)",
                border: "1px solid rgba(20,241,149,0.1)",
                backdropFilter: "blur(5px)",
              }}
            >
              <span className="font-mono text-xs mb-4 block" style={{ color: "#14f195" }}>
                {n}
              </span>
              <h3 className="text-base font-semibold mb-3" style={{ color: "#f5f5f5" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
