"use client"

import { motion } from "motion/react"

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  hover?: boolean
  tone?: "solid" | "glass"
}

export default function Card({ children, className = "", elevated = false, hover = false, tone = "solid" }: CardProps) {
  const base: React.CSSProperties =
    tone === "glass"
      ? {
          background: "linear-gradient(180deg, rgba(23,28,35,0.78) 0%, rgba(23,28,35,0.64) 100%)",
          border: "1px solid rgba(20,241,149,0.16)",
          backdropFilter: "blur(6px)",
        }
      : {
          background: elevated ? "#1f252d" : "#171c22",
          border: "1px solid #2c343e",
        }

  if (hover) {
    return (
      <motion.div
        className={`rounded-3xl p-6 ${className}`}
        style={base}
        whileHover={{
          borderColor: "rgba(20,241,149,0.32)",
          boxShadow: tone === "glass" ? "0 0 30px rgba(20,241,149,0.1)" : "0 0 24px rgba(20,241,149,0.08)",
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={`rounded-3xl p-6 ${className}`}
      style={base}
    >
      {children}
    </div>
  )
}
