"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

const NODE_COUNT = 70
const CONNECTION_DIST = 140
const SPEED = 0.25
const MOUSE_REPEL_RADIUS = 100
const MOUSE_REPEL_STRENGTH = 1.5

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let animId: number
    let width = 0
    let height = 0
    const particles: Particle[] = []

    function resize() {
      if (!canvas) return
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
    }

    function init() {
      particles.length = 0
      for (let i = 0; i < NODE_COUNT; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
        })
      }
    }

    function draw() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      const mx = mouse.current.x
      const my = mouse.current.y

      for (const p of particles) {
        const dx = p.x - mx
        const dy = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_STRENGTH
          p.vx += (dx / dist) * force * 0.05
          p.vy += (dy / dist) * force * 0.05
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (speed > SPEED * 3) {
          p.vx = (p.vx / speed) * SPEED * 3
          p.vy = (p.vy / speed) * SPEED * 3
        }

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        const distToMouse = Math.sqrt((p.x - mx) ** 2 + (p.y - my) ** 2)
        const glowing = distToMouse < MOUSE_REPEL_RADIUS * 1.5

        ctx.beginPath()
        ctx.arc(p.x, p.y, glowing ? 2.5 : 1.8, 0, Math.PI * 2)
        ctx.fillStyle = "#14f195"
        ctx.globalAlpha = glowing ? 0.9 : 0.55
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = "#14f195"
            ctx.globalAlpha = (1 - dist / CONNECTION_DIST) * 0.22
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }

      ctx.globalAlpha = 1
      animId = requestAnimationFrame(draw)
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onMouseLeave() {
      mouse.current = { x: -9999, y: -9999 }
    }

    resize()
    init()
    draw()
    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("mouseleave", onMouseLeave)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      canvas.removeEventListener("mousemove", onMouseMove)
      canvas.removeEventListener("mouseleave", onMouseLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full hidden md:block"
      aria-hidden
    />
  )
}
