"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce, ease } from "@/lib/motion"

function IconBolt() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}

function IconFingerprint() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02.408 1.854 1 2.5" />
      <path d="M10 8.5A4.5 4.5 0 0 1 16.5 13c0 3.5-2 5.5-2 5.5" />
      <path d="M7.5 13A7.5 7.5 0 0 1 12 6.5" />
      <path d="M5.5 13a9.5 9.5 0 0 1 9.5-9" />
      <path d="M4 13c0-4.418 3.582-8 8-8" />
      <path d="M12 13v5" />
    </svg>
  )
}

function IconVault() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14f195" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="16" rx="2" />
      <circle cx="12" cy="11" r="3" />
      <path d="M12 8v-2M12 16v2M15 11h2M7 11H5" />
      <path d="M2 19h20" />
    </svg>
  )
}

const pillars = [
  {
    Icon: IconBolt,
    title: "Automated Discovery & Rebalancing",
    description:
      "Scores the full Meteora pool universe every cycle. Opens positions in optimal bins and rebalances automatically when price drifts beyond the configured threshold.",
    featured: true,
    extra: "Every 60-second loop scores hundreds of pools, ranks by a weighted composite of fees/24h, volume/TVL, bin liquidity depth, and token quality — then executes only when criteria are met.",
  },
  {
    Icon: IconFingerprint,
    title: "Explicit Risk Rails",
    description:
      "Hard limits on position size, total deployment, and daily loss. A kill-switch file stops the agent instantly. DRY_RUN mode enforces safe testing before any real capital moves.",
    featured: false,
    extra: null,
  },
  {
    Icon: IconVault,
    title: "Verifiable Operations",
    description:
      "Every decision logged to Postgres. Systemd service health, dry-run DB writes, and test suite results are all surfaced — nothing happens silently.",
    featured: false,
    extra: null,
  },
]

export default function ValuePillars() {
  return (
    <section
      id="pillars"
      className="py-28 md:py-36 px-4 scroll-mt-24"
      style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-6xl mx-auto">

        {/* section header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={viewportOnce}
          transition={{ duration: 0.75, ease }}
          className="mb-14"
        >
          <span
            className="inline-flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-[0.18em] font-medium mb-5"
            style={{ background: "#0d0d0d", color: "#14f195", border: "1px solid #1e1e1e" }}
          >
            <span className="w-1 h-1" style={{ background: "#14f195" }} />
            What it does
          </span>
          <h2 className="text-3xl md:text-5xl font-bold" style={{ color: "#f0f0f0", letterSpacing: "-0.025em", maxWidth: "600px" }}>
            Built for LPs who care about what happens to their money.
          </h2>
        </motion.div>

        {/* asymmetric bento — 5-col grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 auto-rows-auto"
        >
          {/* featured card — col-span-3, row-span-2 */}
          <motion.div variants={cardReveal} className="md:col-span-3 md:row-span-2">
            {/* outer shell */}
            <div className="h-full" style={{ padding: "1px", background: "#1e1e1e" }}>
              <motion.div
                className="h-full p-7 md:p-9 flex flex-col"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid #141414",
                }}
                whileHover={{
                  borderColor: "#14f19566",
                }}
                transition={{ duration: 0.25 }}
              >
                <div
                  className="w-11 h-11 flex items-center justify-center mb-8"
                  style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}
                >
                  <IconBolt />
                </div>
                <h3 className="text-xl font-semibold mb-4" style={{ color: "#f0f0f0", letterSpacing: "-0.018em" }}>
                  {pillars[0].title}
                </h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "#7a7a7a" }}>
                  {pillars[0].description}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#555" }}>
                  {pillars[0].extra}
                </p>

                {/* accent metric */}
                 <div className="mt-auto pt-10 flex flex-wrap items-end gap-6">
                  <div>
                    <p className="text-4xl font-bold font-mono" style={{ color: "#14f195", letterSpacing: "-0.03em", textShadow: "0 0 30px rgba(20,241,149,0.3)" }}>
                      ~60s
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: "#444" }}>
                      Loop cycle
                    </p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold font-mono" style={{ color: "#f0f0f0", letterSpacing: "-0.03em" }}>
                      35/35
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.14em] mt-1" style={{ color: "#444" }}>
                      Tests passing
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* smaller cards — col-span-2 each */}
          {pillars.slice(1).map(({ Icon, title, description }) => (
            <motion.div key={title} variants={cardReveal} className="md:col-span-2">
              <motion.div
                className="h-full p-6"
                style={{ background: "#0d0d0d", border: "1px solid #1e1e1e" }}
                whileHover={{ borderColor: "#14f19566" }}
                transition={{ duration: 0.2 }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center mb-6"
                  style={{ background: "#0a0a0a", border: "1px solid #1e1e1e" }}
                >
                  <Icon />
                </div>
                <h3 className="text-base font-semibold mb-3" style={{ color: "#f0f0f0", letterSpacing: "-0.015em" }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#7a7a7a" }}>
                  {description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
