# Meteora Agent — Frontend

Premium Next.js dashboard for the Meteora DLMM autonomous agent.
Colosseum Solana Frontier Hackathon 2026.

## Run locally

```bash
cd /opt/meteora-agent/frontend
npm install
npm run dev
# → http://localhost:3000
```

For production:

```bash
npm run build
npm start
```

## Connect real API data

All data currently uses mock values in `lib/api.ts`. To wire the real FastAPI backend:

1. Set the env var:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000   # or your VPS address
   ```

2. In `lib/api.ts`, replace each `// TODO:` mock return with the fetch call shown in the comment. Example:
   ```ts
   // before (mock):
   return { mode: "DRY_RUN", ... }

   // after (real):
   const res = await fetch(`${API_BASE}/status`)
   return res.json()
   ```

3. Implement the FastAPI endpoints in `src/dashboard/` (currently a stub):
   - `GET /status` → `AgentStatus`
   - `GET /kpi` → `KpiSummary`
   - `GET /activity?limit=N` → `ActivityItem[]`
   - `GET /risk` → `RiskUtilization`
   - `GET /safety` → `SafetyConfig`

   All types are defined in `lib/api.ts`.

## Add reveal.mp4

Drop a product video at `public/reveal.mp4` and update `components/hero/HeroSection.tsx`
to replace `<ParticleCanvas />` with a scroll-linked `<video>` element.

## Deploy

```bash
npx vercel --prod
```
