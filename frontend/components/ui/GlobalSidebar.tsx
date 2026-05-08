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
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("sidebar-collapsed") === "true"
  })
  const [hovering, setHovering] = useState(false)
  const isExpanded = !collapsed || hovering

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed))
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`,
    )
  }, [collapsed])

  return (
    <aside
      className="hidden lg:block fixed left-0 top-0 h-screen z-40"
      style={{
        width: `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
        transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
        borderRight: "1px solid #1a1a1a",
        background: "#080808",
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Top edge — green accent bar */}
      <div style={{ height: "2px", background: "#14f195", width: "100%" }} />

      {/* Logo area */}
      <div
        className="flex items-center justify-between px-3 py-4"
        style={{ borderBottom: "1px solid #141414", height: "64px" }}
      >
        {isExpanded && (
          <span
            className="font-mono font-black"
            style={{ fontSize: "11px", letterSpacing: "0.12em", color: "#14f195", textTransform: "uppercase" }}
          >
            METEORA
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="font-mono"
          style={{
            fontSize: "10px",
            letterSpacing: "0.06em",
            color: "#333",
            background: "transparent",
            border: "1px solid #1e1e1e",
            padding: "2px 5px",
            cursor: "pointer",
            flexShrink: 0,
            marginLeft: isExpanded ? 0 : "auto",
            marginRight: isExpanded ? 0 : "auto",
            display: "block",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* Nav links */}
      <nav className="py-3">
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
                padding: isExpanded ? "8px 14px" : "8px 0",
                justifyContent: isExpanded ? "flex-start" : "center",
                color: active ? "#eaeaea" : "#333",
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

      {/* Bottom rule */}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-3"
        style={{ borderTop: "1px solid #141414" }}
      >
        <div
          className="font-mono"
          style={{
            fontSize: "7px",
            letterSpacing: "0.1em",
            color: "#1e1e1e",
            textTransform: "uppercase",
            textAlign: isExpanded ? "left" : "center",
          }}
        >
          {isExpanded ? "REV 2.6  //  D-01" : "2.6"}
        </div>
      </div>
    </aside>
  )
}
