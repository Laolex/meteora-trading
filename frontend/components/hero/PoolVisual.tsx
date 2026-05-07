"use client"

import { motion } from "motion/react"

const BINS = [
  { h: 18, opacity: 0.15 },
  { h: 28, opacity: 0.25 },
  { h: 42, opacity: 0.38 },
  { h: 60, opacity: 0.52 },
  { h: 80, opacity: 0.68 },
  { h: 100, opacity: 0.82 },
  { h: 118, opacity: 1.0, active: true },
  { h: 100, opacity: 0.82 },
  { h: 80, opacity: 0.68 },
  { h: 60, opacity: 0.52 },
  { h: 42, opacity: 0.38 },
  { h: 28, opacity: 0.25 },
  { h: 18, opacity: 0.15 },
]

const BAR_W = 16
const GAP = 6
const BASELINE_Y = 140
const TOTAL_W = BINS.length * (BAR_W + GAP) - GAP

export default function PoolVisual() {
  return (
    <div className="relative w-full flex flex-col items-center">
      {/* header labels */}
      <div className="w-full flex justify-between text-[10px] font-mono mb-2 px-1" style={{ color: "#444" }}>
        <span>lower bound</span>
        <span style={{ color: "#14f195" }}>active bin</span>
        <span>upper bound</span>
      </div>

      <svg
        viewBox={`0 0 ${TOTAL_W + 2} ${BASELINE_Y + 12}`}
        width="100%"
        className="overflow-visible"
        aria-label="DLMM liquidity pool visualization"
      >
        {/* grid lines */}
        {[25, 50, 75, 100].map((pct) => {
          const y = BASELINE_Y - (118 * pct) / 100
          return (
            <line
              key={pct}
              x1={0} y1={y} x2={TOTAL_W} y2={y}
              stroke="#1a2230" strokeWidth="1" strokeDasharray="3 4"
            />
          )
        })}

        {/* baseline */}
        <line x1={0} y1={BASELINE_Y} x2={TOTAL_W} y2={BASELINE_Y} stroke="#14f195" strokeWidth="0.8" opacity="0.25"/>

        {/* bars */}
        {BINS.map((bin, i) => {
          const x = i * (BAR_W + GAP)
          const y = BASELINE_Y - bin.h
          return (
            <motion.rect
              key={i}
              x={x} y={y}
              width={BAR_W} height={bin.h}
              rx={3}
              fill="#14f195"
              opacity={bin.opacity}
              initial={{ scaleY: 0, originY: 1 }}
              animate={bin.active ? {
                opacity: [bin.opacity, 1, bin.opacity],
                transition: { repeat: Infinity, duration: 2.4, ease: "easeInOut" },
              } : {}}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: `${x + BAR_W / 2}px ${BASELINE_Y}px` }}
            />
          )
        })}

        {/* active bin indicator arrow */}
        <motion.g
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          {(() => {
            const activeIdx = BINS.findIndex((b) => b.active)
            const cx = activeIdx * (BAR_W + GAP) + BAR_W / 2
            const tipY = BASELINE_Y - BINS[activeIdx].h - 10
            return (
              <>
                <line x1={cx} y1={tipY} x2={cx} y2={tipY - 12} stroke="#14f195" strokeWidth="1" opacity="0.6" strokeDasharray="2 2"/>
                <text x={cx} y={tipY - 16} textAnchor="middle" fontSize="7" fill="#14f195" opacity="0.7" fontFamily="monospace">
                  active
                </text>
              </>
            )
          })()}
        </motion.g>
      </svg>

      {/* footer */}
      <div className="w-full flex justify-between text-[9px] font-mono mt-1 px-1" style={{ color: "#333" }}>
        <span>← out of range</span>
        <span>price bins →</span>
      </div>
    </div>
  )
}
