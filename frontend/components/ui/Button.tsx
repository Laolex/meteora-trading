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
    boxShadow: "0 0 24px rgba(20,241,149,0.3), 0 0 48px rgba(20,241,149,0.08)",
  },
  secondary: {
    background: "rgba(255,255,255,0.06)",
    color: "#f5f5f5",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  ghost: {
    background: "transparent",
    color: "#666",
  },
}

const base =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer border-0 outline-none"

const arrowContainerVariants = {
  rest: { x: 0, y: 0, scale: 1 },
  hover: { x: 2, y: -1.5, scale: 1.1 },
  tap: { x: 0, y: 0, scale: 0.92 },
}

const wrapperVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.03 },
  tap: { scale: 0.97 },
}

export default function Button({ children, href, onClick, variant = "primary", className = "" }: ButtonProps) {
  const showArrow = variant === "primary"

  if (href) {
    return (
      <motion.div
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        variants={wrapperVariants}
        transition={spring}
        style={{ display: "inline-flex" }}
      >
        <Link href={href} className={`${base} ${className}`} style={styles[variant]}>
          {children}
          {showArrow && (
            <motion.span
              variants={arrowContainerVariants}
              transition={spring}
              className="flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] leading-none"
              style={{ background: "rgba(0,0,0,0.2)", flexShrink: 0 }}
              aria-hidden
            >
              ↗
            </motion.span>
          )}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={wrapperVariants}
      transition={spring}
      onClick={onClick}
      className={`${base} ${className}`}
      style={styles[variant]}
    >
      {children}
      {showArrow && (
        <motion.span
          variants={arrowContainerVariants}
          transition={spring}
          className="flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] leading-none"
          style={{ background: "rgba(0,0,0,0.2)", flexShrink: 0 }}
          aria-hidden
        >
          ↗
        </motion.span>
      )}
    </motion.button>
  )
}
