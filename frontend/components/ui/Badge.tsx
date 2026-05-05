interface BadgeProps {
  children: React.ReactNode
  variant?: "green" | "amber" | "red" | "neutral" | "blue"
  dot?: boolean
}

const colors = {
  green: { bg: "#14f19515", color: "#14f195", dot: "#14f195" },
  amber: { bg: "#f59e0b15", color: "#f59e0b", dot: "#f59e0b" },
  red: { bg: "#ef444415", color: "#ef4444", dot: "#ef4444" },
  neutral: { bg: "#ffffff10", color: "#888888", dot: "#888888" },
  blue: { bg: "#3b82f615", color: "#60a5fa", dot: "#60a5fa" },
}

export default function Badge({ children, variant = "neutral", dot = false }: BadgeProps) {
  const c = colors[variant]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: c.bg, color: c.color }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: c.dot }}
        />
      )}
      {children}
    </span>
  )
}
