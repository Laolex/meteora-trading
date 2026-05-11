"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

export default function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="font-mono flex items-center gap-1.5 transition-opacity"
      style={{
        fontSize: "9px",
        letterSpacing: "0.1em",
        color: pending ? "#555" : "#333",
        background: "transparent",
        border: "1px solid #1e1e1e",
        padding: "3px 8px",
        cursor: pending ? "wait" : "pointer",
      }}
      aria-label="Refresh dashboard"
    >
      <svg
        width="8" height="8" viewBox="0 0 12 12" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        style={{ transform: pending ? "rotate(360deg)" : undefined, transition: "transform 0.6s linear" }}
      >
        <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5V3" />
        <path d="M6 1.5 L8 3.5 L6 5.5" />
      </svg>
      {pending ? "···" : "REFRESH"}
    </button>
  )
}
