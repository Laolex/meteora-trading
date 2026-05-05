interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
}

export default function Card({ children, className = "", elevated = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{
        background: elevated ? "#1a1a1a" : "#111111",
        border: "1px solid #222222",
      }}
    >
      {children}
    </div>
  )
}
