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
      {/* hamburger — morphs to X */}
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

      {/* full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease }}
            className="fixed inset-0 z-[60] md:hidden flex flex-col"
            style={{ background: "#06080c" }}
            onClick={() => setOpen(false)}
          >
            {/* inner border frame */}
            <div
              className="absolute inset-3 rounded-3xl pointer-events-none"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            />

            {/* close button */}
            <div className="flex justify-end p-8">
              <motion.button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.24, ease }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}
              >
                ✕
              </motion.button>
            </div>

            {/* nav links — staggered mask reveal from bottom */}
            <nav className="flex-1 flex flex-col justify-center px-10 gap-1" onClick={(e) => e.stopPropagation()}>
              {links.map(({ href, label }, i) => {
                const active = pathname === href
                return (
                  <div key={href} style={{ overflow: "hidden" }}>
                    <motion.div
                      initial={{ y: 48, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 24, opacity: 0 }}
                      transition={{ delay: 0.08 + i * 0.07, duration: 0.5, ease }}
                    >
                      <Link
                        href={href}
                        className="block py-4 text-4xl font-semibold tracking-tight transition-colors duration-150"
                        style={{
                          color: active ? "#f5f5f5" : "#333",
                          letterSpacing: "-0.02em",
                        }}
                        onClick={() => setOpen(false)}
                      >
                        <motion.span
                          whileHover={{ color: "#f5f5f5", x: 6 }}
                          transition={{ duration: 0.2, ease }}
                          style={{ display: "block" }}
                        >
                          {label}
                          {active && (
                            <span
                              className="ml-3 inline-block w-1.5 h-1.5 rounded-full align-middle"
                              style={{ background: "#14f195", boxShadow: "0 0 8px #14f195" }}
                            />
                          )}
                        </motion.span>
                      </Link>
                    </motion.div>
                  </div>
                )
              })}
            </nav>

            {/* bottom label */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="p-10 text-xs font-mono tracking-widest uppercase"
              style={{ color: "#333" }}
            >
              Meteora Agent · Colosseum 2026
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
