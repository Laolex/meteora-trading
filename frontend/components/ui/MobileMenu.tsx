"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/safety", label: "Safety" },
  { href: "/architecture", label: "Architecture" },
  { href: "/proof", label: "Proof" },
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // close on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      {/* hamburger button — md:hidden so only shows on mobile */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-lg transition-colors"
        style={{ color: "#888" }}
      >
        <motion.span
          animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.22 }}
          className="block w-5 h-px rounded-full"
          style={{ background: "currentColor" }}
        />
        <motion.span
          animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.18 }}
          className="block w-5 h-px rounded-full"
          style={{ background: "currentColor" }}
        />
        <motion.span
          animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.22 }}
          className="block w-5 h-px rounded-full"
          style={{ background: "currentColor" }}
        />
      </button>

      {/* overlay + drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setOpen(false)}
            />

            {/* drawer sliding down from nav */}
            <motion.nav
              key="drawer"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-[60px] left-3 right-3 z-50 md:hidden rounded-2xl overflow-hidden"
              style={{
                background: "rgba(14,18,24,0.97)",
                border: "1px solid rgba(20,241,149,0.12)",
                backdropFilter: "blur(16px)",
              }}
            >
              <ul className="py-3">
                {links.map(({ href, label }, i) => {
                  const active = pathname === href
                  return (
                    <motion.li
                      key={href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.045, duration: 0.2 }}
                    >
                      <Link
                        href={href}
                        className="flex items-center justify-between px-5 py-3.5 text-sm font-medium transition-colors"
                        style={{ color: active ? "#f5f5f5" : "#888888" }}
                      >
                        <span>{label}</span>
                        {active && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: "#14f195", boxShadow: "0 0 6px #14f195" }}
                          />
                        )}
                      </Link>
                      {i < links.length - 1 && (
                        <div className="mx-5 h-px" style={{ background: "#1a2230" }} />
                      )}
                    </motion.li>
                  )
                })}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
