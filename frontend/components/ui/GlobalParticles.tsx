"use client"

import dynamic from "next/dynamic"

const ParticleCanvas = dynamic(() => import("@/components/hero/ParticleCanvas"), { ssr: false })

export default function GlobalParticles() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 1, opacity: 0.18 }}
    >
      <ParticleCanvas />
    </div>
  )
}
