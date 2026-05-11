"use client"

import { motion } from "motion/react"

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  hover?: boolean
  tone?: "solid" | "glass"
  bezel?: boolean
}

const outerShell: React.CSSProperties = {
  padding: "5px",
  borderRadius: "2rem",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.07)",
}

export default function Card({ children, className = "", elevated = false, hover = false, tone = "solid", bezel = false }: CardProps) {
  const innerRadius = "calc(2rem - 5px)"

  const base: React.CSSProperties =
    tone === "glass"
      ? {
          background: "linear-gradient(160deg, rgba(22,27,34,0.9) 0%, rgba(18,23,30,0.82) 100%)",
          border: "1px solid rgba(20,241,149,0.1)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.06)",
        }
      : {
          background: elevated ? "#1f252d" : "#171c22",
          border: "1px solid #2c343e",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }

  const hoverAnim = {
    borderColor: tone === "glass" ? "rgba(20,241,149,0.28)" : "rgba(20,241,149,0.2)",
    boxShadow: tone === "glass"
      ? "0 0 32px rgba(20,241,149,0.1), inset 0 1px 1px rgba(255,255,255,0.08)"
      : "0 0 24px rgba(20,241,149,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
  }

  const paddingClass = "p-6"
  const borderRadiusStyle = bezel ? { borderRadius: innerRadius } : { borderRadius: "1.5rem" }

  if (hover) {
    const inner = (
      <motion.div
        className={`${paddingClass} ${className}`}
        style={{ ...base, ...borderRadiusStyle }}
        whileHover={hoverAnim}
        transition={{ duration: 0.22 }}
      >
        {children}
      </motion.div>
    )

    if (bezel) {
      return <div style={outerShell}>{inner}</div>
    }
    return inner
  }

  const inner = (
    <div
      className={`${paddingClass} ${className}`}
      style={{ ...base, ...borderRadiusStyle }}
    >
      {children}
    </div>
  )

  if (bezel) {
    return <div style={outerShell}>{inner}</div>
  }
  return inner
}
