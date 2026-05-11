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
      aria-label="Main navigation"
      className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
    >
      <div
        className="nav-pill-shell pointer-events-auto p-[5px] rounded-full"
        style={{
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.9), 0 0 0 1px rgba(0,0,0,0.95)",
        }}
      >
        <div
          className="flex items-center gap-1 pl-3 pr-2 py-2 rounded-full"
          style={{
            background: "#07090d",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
          }}
        >
          <Link href="/" aria-label="Meteora Agent home" className="mr-3 flex-shrink-0">
            <Logo size={26} />
          </Link>

          <ul className="hidden md:flex items-center">
            {links.map(({ href, label }) => {
              const active = pathname === href
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="relative px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-colors duration-200 block"
                    style={{ color: active ? "#f5f5f5" : "#666" }}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2 ml-2">
            <div className="hidden md:block">
              <WalletButton />
            </div>
            <MobileMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
