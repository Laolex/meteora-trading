# Meteora Agent — Frontend

Next.js dashboard for the Meteora DLMM autonomous agent.  
**Live:** https://meteora-agent.vercel.app

## Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- Motion (Framer Motion v12)
- `@solana/wallet-adapter-react` — Phantom + Solflare
- `@solana/web3.js` + `@solana/spl-token` — in-browser tx signing
- FastAPI backend at `NEXT_PUBLIC_API_URL`

## Run locally

```bash
cd frontend
npm install

# Point at local backend (optional — falls back to mock data without it)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_AUTHORIZED_PUBKEY=<your-operator-pubkey>" >> .env.local
echo "NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=..." >> .env.local

npm run dev   # → http://localhost:3000
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing — thesis, architecture, safety rails, CTA |
| `/dashboard` | Live agent state — positions, PnL, activity feed, LLM tuner |
| `/safety` | Safety controls — kill switch, guard config, wallet balance |
| `/architecture` | System diagram + module map |
| `/proof` | Git log, DB reachability, recent on-chain actions |

## Dashboard features

- **Status bar** — mode (DRY_RUN / LIVE), network, kill switch state
- **KPI cards** — open positions, daily fees, total deployed, PnL day/week
- **Activity feed** — every agent decision with reason and tx signature
- **Risk gauge** — position util, deployed util, daily loss guard status
- **Wallet balance** — live SOL + USDC from RPC
- **Fund Agent panel** — send SOL/USDC from connected wallet to hot wallet in one tx
- **LLM Tuner panel** — current thresholds, last tuning reasoning, enable/disable toggle (operator only)
- **Vault panel** — on-chain vault state, manager withdraw

## Authentication

Operator wallet (matching `NEXT_PUBLIC_AUTHORIZED_PUBKEY`) signs a nonce via wallet adapter → receives a JWT. Admin controls (kill switch, LLM toggle, withdraw) require this JWT. All other wallets connect as read-only investors.

## Deploy

```bash
vercel --prod
```

Environment variables required on Vercel:
- `NEXT_PUBLIC_API_URL` — FastAPI backend URL
- `NEXT_PUBLIC_AUTHORIZED_PUBKEY` — operator wallet pubkey
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Helius RPC endpoint
