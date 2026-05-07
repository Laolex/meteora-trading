interface Props {
  size?: number
  showWordmark?: boolean
  className?: string
}

export default function Logo({ size = 28, showWordmark = true, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Icon mark — DLMM bin histogram */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <filter id="logo-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.6" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="40" height="40" rx="9" fill="#0c1117"/>
        {/* outer bars */}
        <rect x="1"  y="31" width="4" height="6"  rx="1.2" fill="#14f195" opacity="0.18"/>
        <rect x="37" y="31" width="2" height="6"  rx="1.2" fill="#14f195" opacity="0.18"/>
        {/* mid-outer bars */}
        <rect x="7"  y="27" width="4" height="10" rx="1.2" fill="#14f195" opacity="0.4"/>
        <rect x="31" y="27" width="4" height="10" rx="1.2" fill="#14f195" opacity="0.4"/>
        {/* inner bars */}
        <rect x="13" y="20" width="4" height="17" rx="1.2" fill="#14f195" opacity="0.65"/>
        <rect x="25" y="20" width="4" height="17" rx="1.2" fill="#14f195" opacity="0.65"/>
        {/* active bin — center, full glow */}
        <rect x="19" y="9"  width="4" height="28" rx="1.2" fill="#14f195" filter="url(#logo-glow)"/>
        {/* baseline */}
        <line x1="1" y1="38" x2="39" y2="38" stroke="#14f195" strokeWidth="0.8" opacity="0.28"/>
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className="text-sm font-bold tracking-[0.18em] uppercase"
            style={{ color: "#f0f0f0", letterSpacing: "0.18em" }}
          >
            Meteora
          </span>
          <span
            className="text-[9px] font-semibold tracking-[0.32em] uppercase"
            style={{ color: "#14f195", letterSpacing: "0.32em", marginTop: "1px" }}
          >
            Agent
          </span>
        </span>
      )}
    </span>
  )
}
