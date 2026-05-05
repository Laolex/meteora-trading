import Card from "@/components/ui/Card"

const steps = [
  {
    title: "1. Enable kill switch",
    code: "touch /opt/meteora-agent/var/kill",
    note: "Agent halts within one loop iteration (~60s).",
  },
  {
    title: "2. Stop the service",
    code: "pkill -f 'python -m src.main'\n# or: systemctl --user stop meteora-agent",
    note: "Wait for the process to exit cleanly.",
  },
  {
    title: "3. Tail logs",
    code: "tail -f /opt/meteora-agent/runtime.log",
    note: "Confirm last action and check for open positions before re-enabling.",
  },
]

export default function RollbackBlock() {
  return (
    <Card>
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "#888888" }}>
        Incident / rollback procedure
      </h2>
      <div className="space-y-6">
        {steps.map(({ title, code, note }) => (
          <div key={title}>
            <p className="text-sm font-medium mb-2" style={{ color: "#f5f5f5" }}>{title}</p>
            <pre
              className="text-xs font-mono p-3 rounded-xl overflow-x-auto"
              style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", color: "#14f195" }}
            >
              {code}
            </pre>
            <p className="text-xs mt-2" style={{ color: "#888888" }}>{note}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}
