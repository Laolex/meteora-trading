"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce } from "@/lib/motion"
import Card from "@/components/ui/Card"
import ParticleCanvas from "@/components/hero/ParticleCanvas"

function IconBolt() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

const pillars = [
  {
    Icon: IconBolt,
    title: "Automated Discovery & Rebalancing",
    description:
      "Scores the full Meteora pool universe every cycle. Opens positions in optimal bins and rebalances automatically when price drifts beyond the configured threshold.",
  },
  {
    Icon: IconShield,
    title: "Explicit Risk Rails",
    description:
      "Hard limits on position size, total deployment, and daily loss. A kill-switch file stops the agent instantly. DRY_RUN mode enforces safe testing before any real capital moves.",
  },
  {
    Icon: IconSearch,
    title: "Verifiable Operations",
    description:
      "Every decision logged to Postgres. Systemd service health, dry-run DB writes, and test suite results are all surfaced — nothing happens silently.",
  },
]

export default function ValuePillars() {
  return (
    <section id="pillars" className="relative py-20 md:py-24 px-6 scroll-mt-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <ParticleCanvas />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 12%, rgba(20,241,149,0.07) 0%, rgba(20,241,149,0.025) 40%, transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto rounded-[36px] border border-[rgba(20,241,149,0.1)] bg-[linear-gradient(180deg,rgba(23,28,35,0.58)_0%,rgba(23,28,35,0.46)_100%)] backdrop-blur-[4px] px-6 md:px-10 py-12 md:py-14 md:min-h-[68vh] flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: "#f5f5f5" }}>
            Built for LPs who care about what happens to their money.
          </h2>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid md:grid-cols-3 gap-5"
        >
          {pillars.map(({ Icon, title, description }) => (
            <motion.div key={title} variants={cardReveal}>
              <Card className="h-full" hover tone="glass">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(20,241,149,0.08)", border: "1px solid rgba(20,241,149,0.15)" }}
                >
                  <Icon />
                </div>
                <h3 className="text-base font-semibold mb-3" style={{ color: "#f5f5f5" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9a9a9a" }}>
                  {description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
