"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"

const links = [
  { href: "/", label: "HOME" },
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/safety", label: "SAFETY" },
  { href: "/architecture", label: "ARCHITECTURE" },
  { href: "/proof", label: "PROOF" },
]

const EXPANDED_WIDTH = 164
const COLLAPSED_WIDTH = 44

export default function GlobalSidebar() {
  const pathname = usePathname()
  // Always start collapsed — expands on hover only, or toggle click to pin open
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [hoveredHref, setHoveredHref] = useState<string | null>(null)
  const isExpanded = pinned || hovering

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
    )
  }, [isExpanded])

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen z-40 flex-col"
      style={{
        width: `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
        transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
        borderRight: "1px solid #1a1a1a",
        background: "#101214",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Top accent bar */}
      <div style={{ height: "2px", background: "#14f195", width: "100%", flexShrink: 0 }} />

      {/* Toggle pin button — top-right */}
      <div
        className="flex items-center px-3"
        style={{ height: "52px", flexShrink: 0, justifyContent: isExpanded ? "space-between" : "center" }}
      >
        {isExpanded && (
          <span
            className="font-mono font-black"
            style={{ fontSize: "10px", letterSpacing: "0.14em", color: "#14f195", textTransform: "uppercase" }}
          >
            METEORA
          </span>
        )}
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          className="font-mono"
          style={{
            fontSize: "9px",
            letterSpacing: "0.06em",
            color: "#2a2a2a",
            background: "transparent",
            border: "1px solid #1e1e1e",
            padding: "2px 5px",
            cursor: "pointer",
            flexShrink: 0,
          }}
          aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
        >
          {pinned ? "‹" : "›"}
        </button>
      </div>

      {/* Nav — vertically centered */}
      <nav className="flex-1 flex flex-col justify-center">
        {links.map(({ href, label }) => {
          const active = pathname === href
          const hovered = hoveredHref === href
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center font-mono transition-colors"
              onMouseEnter={() => setHoveredHref(href)}
              onMouseLeave={() => setHoveredHref(null)}
              style={{
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: isExpanded ? "9px 14px" : "9px 0",
                justifyContent: isExpanded ? "flex-start" : "center",
                color: active ? "#eaeaea" : "#555",
                borderLeft: "2px solid transparent",
                background: "transparent",
              }}
            >
              {(active || hovered) && (
                <motion.span
                  layoutId="sidebar-link-highlight"
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: active ? "rgba(20,241,149,0.12)" : "#101214",
                    borderLeft: "2px solid #14f195",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {isExpanded ? (
                <>
                  <span className="relative z-10" style={{ color: active ? "#14f19599" : "#1e1e1e", marginRight: "6px" }}>//</span>
                  <motion.span
                    className="relative z-10"
                    animate={{
                      x: hovered ? 2 : 0,
                      color: active ? "#eaeaea" : hovered ? "#a3a3a3" : "#555",
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {label}
                  </motion.span>
                </>
              ) : (
                <motion.span
                  className="relative z-10"
                  animate={{ color: active ? "#eaeaea" : hovered ? "#a3a3a3" : "#555" }}
                  transition={{ duration: 0.2 }}
                >
                  {label.charAt(0)}
                </motion.span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-3 py-3 font-mono"
        style={{
          borderTop: "1px solid #141414",
          fontSize: "7px",
          letterSpacing: "0.1em",
          color: "#1a1a1a",
          textTransform: "uppercase",
          textAlign: isExpanded ? "left" : "center",
          flexShrink: 0,
        }}
      >
        {isExpanded ? "REV 2.6  //  D-01" : "2.6"}
      </div>
    </aside>
  )
}
