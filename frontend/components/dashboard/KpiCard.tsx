import Card from "@/components/ui/Card"

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export default function KpiCard({ label, value, sub, accent = false }: KpiCardProps) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold leading-none"
        style={{ color: accent ? "#14f195" : "#f5f5f5" }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-2" style={{ color: "#888888" }}>
          {sub}
        </p>
      )}
    </Card>
  )
}
