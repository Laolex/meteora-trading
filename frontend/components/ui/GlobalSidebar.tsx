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

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed))
    document.documentElement.style.setProperty(
      "--sidebar-width",
      `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`,
    )
  }, [collapsed])

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-20 h-[calc(100vh-80px)] z-40 items-center pl-3 pointer-events-none"
      style={{ width: `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px` }}
    >
      <div className="pointer-events-auto relative w-full rounded-3xl border border-[#3b465436] bg-[linear-gradient(180deg,rgba(22,27,34,0.52)_0%,rgba(22,27,34,0.38)_100%)] px-2.5 py-3 backdrop-blur-[3px] transition-all duration-300">
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
        <nav className={`w-full flex flex-col gap-1.5 ${collapsed ? "pl-2 pr-1 pt-8" : "pl-3 pt-8"}`}>
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <motion.div key={href} whileHover={{ x: -2 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
              <Link
                href={href}
                className={`group block w-full py-1.5 text-[12px] tracking-wide transition-all ${collapsed ? "px-0 text-center" : "px-1"}`}
                style={{
                  color: active ? "#ececec" : "#8f96a0",
                }}
              >
                <span
                  className="inline-block transition-all group-hover:text-[#dcdcdc]"
                  style={{ textShadow: active ? "0 0 14px rgba(20,241,149,0.18)" : "none" }}
                >
                  {collapsed ? label.charAt(0) : label}
                </span>
                <span
                  className={`block mt-1 h-px transition-all ${collapsed ? "mx-auto" : ""}`}
                  style={{
                    width: collapsed ? (active ? "18px" : "12px") : active ? "40px" : "25px",
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
