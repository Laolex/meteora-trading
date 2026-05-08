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

const EXPANDED_WIDTH = 176
const COLLAPSED_WIDTH = 68

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
      className="hidden lg:flex fixed left-0 top-24 h-[calc(100vh-96px)] z-40 items-center pl-3 pointer-events-none"
      style={{ width: `${isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH}px`, transition: "width 0.28s cubic-bezier(0.22,1,0.36,1)" }}
    >
      <div
        className="pointer-events-auto relative w-full rounded-3xl border border-[#2e3740] bg-[linear-gradient(180deg,rgba(12,16,22,0.97)_0%,rgba(10,14,20,0.95)_100%)] px-2.5 py-3 backdrop-blur-[16px] transition-all duration-300"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute right-2 top-2 h-6 w-6 rounded-full border border-[#3b465451] text-[#9da7b3] transition hover:text-[#d6dbe1]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
        <div className="h-44 w-px rounded-full bg-gradient-to-b from-[#14f19526] via-[#3a434f] to-transparent absolute left-2.5 top-1/2 -translate-y-1/2" />
        <nav className={`w-full flex flex-col gap-1.5 ${isExpanded ? "pl-3 pt-8" : "pl-2 pr-1 pt-8"}`}>
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <motion.div key={href} whileHover={{ x: -2 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
              <Link
                href={href}
                className={`group block w-full py-1.5 text-[12px] tracking-wide transition-all ${isExpanded ? "px-1" : "px-0 text-center"}`}
                style={{
                  color: active ? "#ececec" : "#8f96a0",
                }}
              >
                <span
                  className="inline-block transition-all group-hover:text-[#dcdcdc]"
                  style={{ textShadow: active ? "0 0 14px rgba(20,241,149,0.18)" : "none" }}
                >
                  {isExpanded ? label : label.charAt(0)}
                </span>
                <span
                  className={`block mt-1 h-px transition-all ${isExpanded ? "" : "mx-auto"}`}
                  style={{
                    width: isExpanded ? (active ? "40px" : "25px") : active ? "18px" : "12px",
                    background: active ? "rgba(20,241,149,0.36)" : "rgba(255,255,255,0.12)",
                  }}
                />
              </Link>
            </motion.div>
          )
        })}
        </nav>
        <div
          aria-hidden
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-64 w-px"
          style={{ background: "linear-gradient(to bottom, transparent, rgba(67,78,92,0.55), transparent)" }}
        />
      </div>
    </aside>
  )
}
