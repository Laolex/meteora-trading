"use client"

import { motion } from "motion/react"

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  hover?: boolean
}

export default function Card({ children, className = "", elevated = false, hover = false }: CardProps) {
  const base: React.CSSProperties = {
    background: elevated ? "#1a1a1a" : "#111111",
    border: "1px solid #222222",
  }

  if (hover) {
    return (
      <motion.div
        className={`rounded-2xl p-6 ${className}`}
        style={base}
        whileHover={{
          borderColor: "rgba(20,241,149,0.3)",
          boxShadow: "0 0 24px rgba(20,241,149,0.08)",
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={base}
    >
      {children}
    </div>
  )
}
