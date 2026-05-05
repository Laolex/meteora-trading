"use client"

import { motion } from "motion/react"
import Link from "next/link"

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  className?: string
}

const spring = { type: "spring" as const, stiffness: 400, damping: 17 }

const styles: Record<string, React.CSSProperties> = {
  primary: {
    background: "#14f195",
    color: "#0a0a0a",
    boxShadow: "0 0 20px rgba(20,241,149,0.25), 0 0 40px rgba(20,241,149,0.08)",
  },
  secondary: {
    background: "transparent",
    color: "#f5f5f5",
    border: "1px solid #333",
  },
  ghost: {
    background: "transparent",
    color: "#888888",
  },
}

const base =
  "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium cursor-pointer border-0 outline-none"

export default function Button({ children, href, onClick, variant = "primary", className = "" }: ButtonProps) {
  if (href) {
    return (
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        transition={spring}
        style={{ display: "inline-flex" }}
      >
        <Link href={href} className={`${base} ${className}`} style={styles[variant]}>
          {children}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      onClick={onClick}
      className={`${base} ${className}`}
      style={styles[variant]}
    >
      {children}
    </motion.button>
  )
}
