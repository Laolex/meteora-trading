"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import dynamic from "next/dynamic"

const WalletButton = dynamic(() => import("./WalletButton"), { ssr: false })

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/safety", label: "Safety" },
  { href: "/architecture", label: "Architecture" },
  { href: "/proof", label: "Proof" },
]

const ease = [0.22, 1, 0.36, 1] as const

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden relative flex items-center justify-center w-8 h-8 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="relative w-4 h-3 flex flex-col justify-between">
          <motion.span
            animate={open ? { rotate: 45, y: 5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.28, ease }}
            className="block h-px w-full rounded-full"
            style={{ background: open ? "#f5f5f5" : "#888" }}
          />
          <motion.span
            animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.2, ease }}
            className="block h-px w-full rounded-full"
            style={{ background: "#888" }}
          />
          <motion.span
            animate={open ? { rotate: -45, y: -5.5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.28, ease }}
            className="block h-px w-full rounded-full"
            style={{ background: open ? "#f5f5f5" : "#888" }}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.6)" }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.24, ease }}
              className="fixed top-[72px] left-4 right-4 z-50 md:hidden rounded-2xl overflow-hidden"
              style={{
                background: "#0d0f14",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
              }}
            >
              <nav className="p-2">
                {links.map(({ href, label }, i) => {
                  const active = pathname === href
                  return (
                    <motion.div
                      key={href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2, ease }}
                    >
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-150"
                        style={{
                          background: active ? "rgba(20,241,149,0.06)" : "transparent",
                          color: active ? "#f5f5f5" : "#666",
                        }}
                      >
                        {active && (
                          <span
                            className="flex-shrink-0 w-1 h-1 rounded-full"
                            style={{ background: "#14f195" }}
                          />
                        )}
                        <span className="text-[15px] font-medium tracking-tight">{label}</span>
                      </Link>
                    </motion.div>
                  )
                })}
              </nav>

              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "#2a2a2a" }}>
                  Colosseum 2026
                </span>
                <WalletButton />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
