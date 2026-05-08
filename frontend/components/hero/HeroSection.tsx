"use client"

import { useRef } from "react"
import { motion } from "motion/react"
import { ease } from "@/lib/motion"
import ParticleCanvas from "./ParticleCanvas"
import Link from "next/link"

const stats = [
  { label: "LOOP CYCLE", value: "~60s" },
  { label: "TESTS PASSING", value: "35 / 35" },
  { label: "SAFETY LAYERS", value: "4" },
]

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null)

  return (
    <section
      id="hero"
      ref={containerRef}
      className="relative min-h-[100dvh] flex flex-col justify-center px-4 overflow-hidden scroll-mt-24"
      style={{ paddingTop: "96px", paddingBottom: "64px" }}
    >
      {/* Background */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #0d1117 0%, #101520 56%, #0d1116 100%)" }}>
        <ParticleCanvas />
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.25 }}>
          <img src="/hero-illustration.svg" alt="" aria-hidden className="w-full h-full" style={{ objectFit: "cover", objectPosition: "center" }} />
        </div>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 55% at 30% 55%, rgba(20,241,149,0.07) 0%, transparent 65%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, #0d1116)" }} />
      </div>

      {/* Content — left aligned, asymmetric */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="max-w-3xl">

          {/* Hackathon tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="mb-8 flex items-center gap-3"
          >
            <span
              className="inline-block w-1.5 h-1.5 flex-shrink-0"
              style={{ background: "#14f195", boxShadow: "0 0 6px #14f195" }}
            />
            <span
              className="font-mono"
              style={{ fontSize: "9px", letterSpacing: "0.2em", color: "#14f195", textTransform: "uppercase" }}
            >
              Colosseum Solana Frontier Hackathon 2026
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease, delay: 0.1 }}
            className="font-mono font-black leading-none uppercase mb-8"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 6rem)",
              letterSpacing: "-0.03em",
              color: "#eaeaea",
            }}
          >
            Autonomous<br />
            Liquidity,{" "}
            <span style={{ color: "#14f195", textShadow: "0 0 60px rgba(20,241,149,0.3)" }}>
              Human<br />Risk Controls.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.85, ease, delay: 0.25 }}
            className="font-mono mb-10 max-w-xl"
            style={{ fontSize: "12px", color: "#444", lineHeight: 1.85, letterSpacing: "0.04em" }}
          >
            A safety-first Meteora DLMM agent for Solana. Scores the pool universe,
            opens optimal positions, rebalances on drift, exits on volatility —
            with explicit guards at every step.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease, delay: 0.38 }}
            className="flex flex-wrap gap-3 mb-16"
          >
            <Link
              href="/dashboard"
              className="font-mono transition-colors"
              style={{
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "10px 22px",
                border: "1px solid #14f195",
                color: "#14f195",
                background: "transparent",
              }}
            >
              [ VIEW LIVE DASHBOARD ]
            </Link>
            <Link
              href="/architecture"
              className="font-mono transition-colors"
              style={{
                fontSize: "10px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "10px 22px",
                border: "1px solid #1e1e1e",
                color: "#444",
                background: "transparent",
              }}
            >
              [ READ ARCHITECTURE ]
            </Link>
          </motion.div>

          {/* Stat strip — flat terminal table */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.55 }}
            style={{ border: "1px solid #1a1a1a", display: "inline-flex", background: "#0a0a0a" }}
          >
            {stats.map(({ label, value }, i) => (
              <div
                key={label}
                className="px-6 py-4 text-center"
                style={{ borderRight: i < stats.length - 1 ? "1px solid #141414" : "none" }}
              >
                <p
                  className="font-mono font-bold"
                  style={{ fontSize: "18px", color: "#14f195", letterSpacing: "-0.01em" }}
                >
                  {value}
                </p>
                <p
                  className="font-mono mt-1"
                  style={{ fontSize: "7px", letterSpacing: "0.14em", color: "#2a2a2a", textTransform: "uppercase" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ color: "#1e1e1e" }}
        aria-hidden
      >
        <span className="font-mono" style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase" }}>scroll</span>
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
