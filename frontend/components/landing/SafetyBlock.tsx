"use client"

import { motion } from "motion/react"
import { staggerContainer, cardReveal, viewportOnce } from "@/lib/motion"
import Badge from "@/components/ui/Badge"
import ParticleCanvas from "@/components/hero/ParticleCanvas"
import type { SafetyConfig } from "@/lib/api"

interface Props {
  safety: SafetyConfig
}

const badgeVariant = (status: string) => {
  if (status === "active" || status === "pass" || status === "enforced" || status === "clear") return "green" as const
  if (status === "armed" || status === "off") return "amber" as const
  return "neutral" as const
}

export default function SafetyBlock({ safety }: Props) {
  const rails = [
    {
      label: "DRY_RUN Mode",
      status: safety.dryRun ? "active" : "off",
      description: "Agent runs the full loop — discovery, scoring, decisions — but no transactions are sent. Safe by default.",
    },
    {
      label: "Kill Switch",
      status: safety.killSwitchPresent ? "armed" : "clear",
      description: "Touch /var/kill and the agent stops within one loop iteration. No code changes, no restarts.",
    },
    {
      label: "Position Caps",
      status: "enforced",
      description: `Max $${safety.maxPositionUsd} per position · $${safety.maxTotalDeployedUsd} total deployed. Checked before every open.`,
    },
    {
      label: "Live Gate",
      status: safety.liveGatePass ? "pass" : "blocked",
      description: "Checklist of preconditions must all pass before DRY_RUN can be disabled: wallet, DB, RPC, node-helper.",
    },
  ]
  return (
    <section id="safety" className="relative py-20 md:py-24 px-6 scroll-mt-24 overflow-hidden" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="absolute inset-0 pointer-events-none opacity-35">
        <ParticleCanvas />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 58% 50% at 50% 12%, rgba(20,241,149,0.08) 0%, rgba(20,241,149,0.03) 42%, transparent 70%)",
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#f5f5f5" }}>
            Safety first. Every time.
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#a3a3a3" }}>
            No feature ships that touches capital without a guard. These aren&apos;t fallbacks — they&apos;re primary controls.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
           className="grid md:grid-cols-2 gap-5"
        >
          {rails.map(({ label, status, description }) => (
            <motion.div
              key={label}
              variants={cardReveal}
               className="flex gap-4 p-5 rounded-3xl"
               style={{
                 background: "linear-gradient(180deg, rgba(23,28,35,0.78) 0%, rgba(23,28,35,0.62) 100%)",
                 border: "1px solid rgba(20,241,149,0.1)",
                 backdropFilter: "blur(6px)",
               }}
              whileHover={{ borderColor: "rgba(20,241,149,0.2)", boxShadow: "0 0 20px rgba(20,241,149,0.05)" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-sm" style={{ color: "#f5f5f5" }}>{label}</h3>
                  <Badge variant={badgeVariant(status)} dot>{status}</Badge>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#a3a3a3" }}>{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
