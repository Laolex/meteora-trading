"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { motion } from "motion/react"

export default function RefreshButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="font-mono inline-flex items-center gap-2"
      style={{
        fontSize: "9px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "5px 12px",
        border: "1px solid #1e1e1e",
        color: isPending ? "#14f195" : "#666",
        background: "transparent",
        minHeight: "32px",
      }}
      aria-label="Refresh dashboard data"
    >
      <motion.span
        className="inline-block w-1.5 h-1.5"
        style={{ background: isPending ? "#14f195" : "#333" }}
        animate={isPending ? { rotate: 360, scale: [1, 1.4, 1] } : { rotate: 0, scale: 1 }}
        transition={isPending ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
      />
      {isPending ? "Refreshing..." : "Refresh"}
    </button>
  )
}
