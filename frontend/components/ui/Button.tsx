"use client"

import { motion } from "motion/react"
import { buttonMotion } from "@/lib/motion"
import Link from "next/link"

interface ButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  className?: string
}

export default function Button({ children, href, onClick, variant = "primary", className = "" }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer border-0 outline-none"

  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "#14f195", color: "#0a0a0a" },
    secondary: { background: "transparent", color: "#f5f5f5", border: "1px solid #333" },
    ghost: { background: "transparent", color: "#888888" },
  }

  const content = (
    <motion.span
      {...buttonMotion}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
    >
      {children}
    </motion.span>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} ${className}`}
        style={styles[variant]}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`${base} ${className}`}
      style={styles[variant]}
    >
      {content}
    </button>
  )
}
