"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/safety", label: "Safety" },
  { href: "/architecture", label: "Architecture" },
  { href: "/proof", label: "Proof" },
]

const EXPANDED_WIDTH = 148
const COLLAPSED_WIDTH = 40

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
      className="hidden lg:block fixed left-0 top-20 h-[calc(100vh-80px)] z-40 pointer-events-none"
      style={{
        width: `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`,
        transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div
        className="pointer-events-auto h-full flex flex-col pl-1 pt-10"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* decorative accent line */}
        <div
          aria-hidden
          className="absolute left-1 top-1/4 w-px h-28 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(20,241,149,0.22), transparent)" }}
        />

        <nav className="flex flex-col gap-0.5">
          {links.map(({ href, label }) => {
            const active = pathname === href
            return (
              <motion.div
                key={href}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
              >
                <Link
                  href={href}
                  className="group block py-2 text-[12px] tracking-wide transition-colors overflow-hidden whitespace-nowrap"
                  style={{
                    color: active ? "#ececec" : "#5a6170",
                    textShadow: active ? "0 0 14px rgba(20,241,149,0.2)" : "none",
                  }}
                >
                  <span className="group-hover:text-[#c0c8d0] transition-colors">
                    {isExpanded ? label : label.charAt(0)}
                  </span>
                  <span
                    className="block mt-1 h-px"
                    style={{
                      width: isExpanded ? (active ? "36px" : "18px") : (active ? "14px" : "8px"),
                      background: active ? "rgba(20,241,149,0.5)" : "rgba(255,255,255,0.1)",
                      transition: "width 0.22s cubic-bezier(0.22,1,0.36,1)",
                    }}
                  />
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* toggle — persists collapse state */}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="mt-auto mb-8 text-[11px] transition-colors text-left"
          style={{ color: "#333" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed && !hovering ? "›" : "‹"}
        </button>
      </div>
    </aside>
  )
}
