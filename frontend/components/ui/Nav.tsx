"use client"

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

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(10,10,10,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1a1a1a",
      }}
    >
      <Link href="/" className="text-sm font-semibold tracking-widest uppercase text-[#14f195]">
        Meteora Agent
      </Link>
      <ul className="hidden md:flex items-center gap-6">
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                className="relative text-sm transition-colors"
                style={{ color: active ? "#f5f5f5" : "#888888" }}
              >
                {label}
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-px"
                    style={{ background: "#14f195" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        href="/dashboard"
        className="text-xs font-medium px-4 py-2 rounded-full border transition-colors"
        style={{ borderColor: "#14f195", color: "#14f195" }}
      >
        Live Dashboard
      </Link>
    </nav>
  )
}
