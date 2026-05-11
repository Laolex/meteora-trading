"use client"

import { useState } from "react"

interface Props {
  label: string
  badge?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({ label, badge, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: "#0A0A0A" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-2 flex items-center justify-between"
        style={{ borderBottom: open ? "1px solid #1e1e1e" : "none", background: "transparent", cursor: "pointer" }}
      >
        <span className="term-label">{label}</span>
        <div className="flex items-center gap-2">
          {badge && <span className="font-mono" style={{ fontSize: "9px", color: "#555" }}>{badge}</span>}
          <span className="font-mono" style={{ fontSize: "9px", color: "#333" }}>{open ? "−" : "+"}</span>
        </div>
      </button>
      {open && children}
    </div>
  )
}
