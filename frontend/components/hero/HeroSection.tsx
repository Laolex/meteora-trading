"use client"

import { useRef } from "react"
import { motion, useMotionValue, useTransform, useSpring } from "motion/react"
import { ease } from "@/lib/motion"
import ParticleCanvas from "./ParticleCanvas"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"

const stats = [
  { label: "Loop cycle", value: "~60s" },
  { label: "Tests passing", value: "35 / 35" },
  { label: "Safety layers", value: "4" },
]

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
      className="relative min-h-[100dvh] pt-28 md:pt-36 pb-16 flex flex-col items-center justify-center px-4 overflow-hidden scroll-mt-24"
    >
      {/* background */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #0d1117 0%, #101520 56%, #0d1116 100%)" }}
      >
        <ParticleCanvas />
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }}>
          <img
            src="/hero-illustration.svg"
            alt=""
            aria-hidden
            className="w-full h-full"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
        </div>
        {/* radial glow — more refined */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(20,241,149,0.09) 0%, rgba(20,241,149,0.03) 50%, transparent 75%)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #0d1116)" }}
        />
      </div>

      {/* content card with parallax + double-bezel */}
      <motion.div
        style={{ rotateX, rotateY, translateX, translateY, transformPerspective: 900 }}
        className="relative z-10 w-full max-w-5xl mx-auto"
      >
        {/* outer shell */}
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
            className="text-center px-6 md:px-12 py-10 md:py-16"
            style={{
              borderRadius: "calc(2.5rem - 6px)",
              background: "linear-gradient(180deg, rgba(16,20,28,0.88) 0%, rgba(13,17,24,0.82) 100%)",
              backdropFilter: "blur(8px)",
              boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06)",
              border: "1px solid rgba(20,241,149,0.08)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease }}
              className="mb-7"
            >
              <Badge variant="green" dot>
                Colosseum Solana Frontier Hackathon 2026
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-[5.5rem] font-bold leading-[1.05] tracking-tight"
              style={{ color: "#f0f0f0", letterSpacing: "-0.03em" }}
            >
              Autonomous Liquidity,{" "}
              <span
                style={{
                  color: "#14f195",
                  textShadow: "0 0 60px rgba(20,241,149,0.35)",
                }}
              >
                Human Risk Controls.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.85, ease, delay: 0.25 }}
              className="mt-7 text-base md:text-lg max-w-2xl mx-auto"
              style={{ color: "#7a7a7a", lineHeight: 1.72, letterSpacing: "0.003em" }}
            >
              A safety-first Meteora DLMM agent for Solana. Scores the pool universe,
              opens optimal positions, rebalances on drift, exits on volatility —
              with explicit guards at every step.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.85, ease, delay: 0.4 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3"
            >
              <Button href="/dashboard" variant="primary">View Live Dashboard</Button>
              <Button href="/architecture" variant="secondary">Read Architecture</Button>
            </motion.div>

            {/* stat strip — double-bezel treatment */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease, delay: 0.6 }}
              className="mt-12"
            >
              <div
                style={{
                  padding: "4px",
                  borderRadius: "1.25rem",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "inline-flex",
                  gap: 0,
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    borderRadius: "calc(1.25rem - 4px)",
                    background: "rgba(8,11,16,0.7)",
                    overflow: "hidden",
                  }}
                >
                  {stats.map(({ label, value }, i) => (
                    <div
                      key={label}
                      className="px-7 py-4 text-center"
                      style={{
                        borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}
                    >
                      <p
                        className="text-xl font-semibold font-mono"
                        style={{ color: "#14f195", textShadow: "0 0 20px rgba(20,241,149,0.35)", letterSpacing: "-0.01em" }}
                      >
                        {value}
                      </p>
                      <p
                        className="text-[10px] mt-1.5 uppercase tracking-[0.12em]"
                        style={{ color: "#444" }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "#2a2a2a" }}
        aria-hidden
      >
        <span className="text-[10px] uppercase tracking-[0.18em] font-mono">scroll</span>
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: [0.22, 1, 0.36, 1] }}
          className="w-px h-8"
          style={{ background: "linear-gradient(to bottom, #14f195, transparent)" }}
        />
      </motion.div>
    </section>
  )
}
