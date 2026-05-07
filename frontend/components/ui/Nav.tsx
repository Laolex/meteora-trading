"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "motion/react"
import dynamic from "next/dynamic"
import Logo from "./Logo"
import MobileMenu from "./MobileMenu"

const WalletButton = dynamic(() => import("./WalletButton"), { ssr: false })

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
      <Link href="/" aria-label="Meteora Agent home">
        <Logo size={28} />
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
      <div className="flex items-center gap-3">
        <WalletButton />
        <MobileMenu />
      </div>
    </nav>
  )
}
