"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  const isExpanded = pinned || hovering

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${pinned ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
    )
  }, [pinned])

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen z-40 flex-col"
      style={{
        width: `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
        transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
        borderRight: "1px solid #1a1a1a",
        background: "transparent",
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
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center font-mono transition-colors"
              style={{
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: isExpanded ? "9px 14px" : "9px 0",
                justifyContent: isExpanded ? "flex-start" : "center",
                color: active ? "#eaeaea" : "#2a2a2a",
                borderLeft: active ? "2px solid #14f195" : "2px solid transparent",
                background: active ? "#14f1950a" : "transparent",
              }}
            >
              {isExpanded ? (
                <>
                  <span style={{ color: active ? "#14f19566" : "#1e1e1e", marginRight: "6px" }}>//</span>
                  {label}
                </>
              ) : (
                <span>{label.charAt(0)}</span>
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
