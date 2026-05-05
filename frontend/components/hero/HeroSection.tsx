"use client"

import { motion } from "motion/react"
import { ease } from "@/lib/motion"
import ParticleCanvas from "./ParticleCanvas"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{ paddingTop: "80px" }}
    >
      {/* particle background */}
      <div className="absolute inset-0" style={{ background: "#0a0a0a" }}>
        <ParticleCanvas />
        {/* radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(20,241,149,0.04) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="mb-6"
        >
          <Badge variant="green" dot>
            Colosseum Solana Frontier Hackathon 2026
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold leading-tight tracking-tight"
          style={{ color: "#f5f5f5" }}
        >
          Autonomous Liquidity,{" "}
          <span style={{ color: "#14f195" }}>Human Risk Controls.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#888888" }}
        >
          A safety-first Meteora DLMM agent for Solana. Scores the pool universe,
          opens optimal positions, rebalances on drift, exits on volatility —
          with explicit guards at every step.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button href="/dashboard" variant="primary">
            View Live Dashboard
          </Button>
          <Button href="/architecture" variant="secondary">
            Read Architecture
          </Button>
        </motion.div>

        {/* stat strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease, delay: 0.7 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {[
            { label: "Mode", value: "DRY_RUN" },
            { label: "Network", value: "Devnet" },
            { label: "Agent", value: "Active" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-semibold" style={{ color: "#14f195" }}>
                {value}
              </p>
              <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#888888" }}>
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "#444444" }}
        aria-hidden
      >
        <span className="text-xs uppercase tracking-widest">scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="w-px h-8"
          style={{ background: "linear-gradient(to bottom, #14f195, transparent)" }}
        />
      </motion.div>
    </section>
  )
}
