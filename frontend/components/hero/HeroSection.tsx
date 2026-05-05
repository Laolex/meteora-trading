"use client"

import { useRef } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "motion/react"
import { ease } from "@/lib/motion"
import ParticleCanvas from "./ParticleCanvas"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { stiffness: 50, damping: 20 }
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), springConfig)
  const translateX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig)
  const translateY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-8, 8]), springConfig)

  function handleMouseMove(e: React.MouseEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section
      id="hero"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[calc(100svh-5rem)] pt-20 md:pt-24 pb-14 flex flex-col items-center justify-center px-6 overflow-hidden scroll-mt-24"
    >
      {/* background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #171c23 0%, #141920 56%, #11161d 100%)" }}
      >
        <ParticleCanvas />
        {/* radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 72% 56% at 50% 65%, rgba(20,241,149,0.11) 0%, rgba(20,241,149,0.04) 42%, transparent 72%)",
          }}
        />
        {/* bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #11161d)" }}
        />
      </div>

      {/* content with parallax */}
      <motion.div
        className="relative z-10 text-center max-w-6xl mx-auto rounded-[36px] border border-[rgba(20,241,149,0.1)] bg-[linear-gradient(180deg,rgba(23,28,35,0.76)_0%,rgba(23,28,35,0.58)_100%)] backdrop-blur-[4px] px-6 md:px-10 py-10 md:py-14"
        style={{ rotateX, rotateY, translateX, translateY, transformPerspective: 800 }}
      >
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
          <span
            style={{
              color: "#14f195",
              textShadow: "0 0 40px rgba(20,241,149,0.4)",
            }}
          >
            Human Risk Controls.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.25 }}
          className="mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#a3a3a3" }}
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
          <Button href="/dashboard" variant="primary">View Live Dashboard</Button>
          <Button href="/architecture" variant="secondary">Read Architecture</Button>
        </motion.div>

        {/* stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.65 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
        >
          {[
            { label: "Mode", value: "DRY_RUN" },
            { label: "Network", value: "Devnet" },
            { label: "Agent", value: "Active" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p
                className="text-2xl font-semibold"
                style={{ color: "#14f195", textShadow: "0 0 20px rgba(20,241,149,0.3)" }}
              >
                {value}
              </p>
              <p className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#555555" }}>
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "#333333" }}
        aria-hidden
      >
        <span className="text-xs uppercase tracking-widest font-mono">scroll</span>
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
