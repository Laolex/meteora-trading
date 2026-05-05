"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce } from "@/lib/motion"
import Card from "@/components/ui/Card"

const pillars = [
  {
    icon: "⚡",
    title: "Automated Discovery & Rebalancing",
    description:
      "Scores the full Meteora pool universe every cycle. Opens positions in optimal bins and rebalances automatically when price drifts beyond the configured threshold.",
  },
  {
    icon: "🛡️",
    title: "Explicit Risk Rails",
    description:
      "Hard limits on position size, total deployment, and daily loss. A kill-switch file stops the agent instantly. DRY_RUN mode enforces safe testing before any real capital moves.",
  },
  {
    icon: "🔍",
    title: "Verifiable Operations",
    description:
      "Every decision logged to Postgres. Systemd service health, dry-run DB writes, and test suite results are all surfaced — nothing happens silently.",
  },
]

export default function ValuePillars() {
  return (
    <section className="py-24 px-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
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
        className="grid md:grid-cols-3 gap-6"
      >
        {pillars.map(({ icon, title, description }) => (
          <motion.div key={title} variants={cardReveal}>
            <Card className="h-full">
              <div className="text-3xl mb-4" aria-hidden>{icon}</div>
              <h3 className="text-lg font-semibold mb-3" style={{ color: "#f5f5f5" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>
                {description}
              </p>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
