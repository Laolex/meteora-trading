const steps = [
  {
    label: "STEP 1",
    title: "Enable kill switch",
    code: "touch /opt/meteora-agent/var/kill",
    note: "Agent halts within one loop iteration (~60s).",
  },
  {
    label: "STEP 2",
    title: "Stop the service",
    code: "pkill -f 'python -m src.main'\n# or: systemctl --user stop meteora-agent",
    note: "Wait for the process to exit cleanly.",
  },
  {
    label: "STEP 3",
    title: "Tail logs",
    code: "tail -f /opt/meteora-agent/runtime.log",
    note: "Confirm last action and check for open positions before re-enabling.",
  },
]

export default function RollbackBlock() {
  return (
    <div>
      <div className="px-4 py-2" style={{ borderBottom: "1px solid #141414" }}>
        <span className="term-label">[ INCIDENT / ROLLBACK PROCEDURE ]</span>
      </div>
      <div>
        {steps.map(({ label, title, code, note }, i) => (
          <div
            key={label}
            className="px-4 py-4"
            style={{ borderBottom: i < steps.length - 1 ? "1px solid #111" : undefined }}
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-mono" style={{ fontSize: "8px", letterSpacing: "0.12em", color: "#e61919" }}>{label}</span>
              <span className="font-mono" style={{ fontSize: "10px", color: "#888", letterSpacing: "0.06em", textTransform: "uppercase" }}>{title}</span>
            </div>
            <pre
              className="font-mono overflow-x-auto"
              style={{
                fontSize: "10px",
                padding: "8px 12px",
                background: "#0a0a0a",
                border: "1px solid #1e1e1e",
                color: "#14f195",
                lineHeight: 1.6,
                letterSpacing: "0.02em",
              }}
            >
              {code}
            </pre>
            <p className="font-mono mt-2" style={{ fontSize: "9px", color: "#3a3a3a", letterSpacing: "0.03em" }}>{note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
