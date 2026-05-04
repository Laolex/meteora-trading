# Meteora DLMM Autonomous Agent

Autonomous discovery and rebalancing agent for Meteora DLMM liquidity positions on Solana.

**Submission:** Colosseum Solana Frontier Hackathon (April 6 – May 11, 2026)

---

## Thesis

90% of LPs lose money to impermanent loss and out-of-range positions. Manual DLMM management is brutal — pools shift, bins move, fees compound only when positions stay active. This agent runs the whole loop autonomously: scores the pool universe by risk-adjusted yield, opens positions in optimal bins, rebalances when price drifts out of range, and exits on volatility breaches.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  DISCOVERY LAYER                                             │
│  Meteora API → pool universe → scoring → ranked candidates   │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  DECISION ENGINE                                             │
│  Position state + market conditions → action                 │
│  (open / hold / rebalance / exit)                            │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  POSITION MANAGER                                            │
│  Meteora SDK calls: deposit / withdraw / claim / close       │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  EXECUTOR                                                    │
│  Hot wallet signer → Solana RPC → confirmation               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│  DB + DASHBOARD                                              │
│  Postgres warehouse → Next.js dashboard → live PnL           │
└──────────────────────────────────────────────────────────────┘
```

## Module map

| Path | Purpose |
|---|---|
| `src/discovery/` | Pull pools, score, rank |
| `src/position/` | Read state, open/close positions |
| `src/rebalance/` | Decision logic, safety rails |
| `src/executor/` | Reserved for tx executor integration (stub) |
| `src/db/` | Reserved for persistence layer (stub) |
| `src/dashboard/` | Reserved for dashboard API/UI (stub) |
| `sql/` | Schema migrations |

## Quick start

```bash
cp .env.example .env  # fill in HELIUS_API_KEY, DATABASE_URL, HOT_WALLET_KEYPAIR_PATH
docker compose up -d postgres
psql postgresql://meteora:meteora@localhost:5432/meteora_agent -f sql/001_initial_schema.sql
METEORA_SKIP_CONFIG_LOAD=1 python -m pytest -q
python -m src.main --mode=discovery   # populate pool rankings
python -m src.main --mode=run          # autonomous loop skeleton
```

## Safety rails (hard-coded, not optional)

- `MAX_POSITION_USD` — never deploy more than this per pool
- `MAX_TOTAL_DEPLOYED_USD` — global cap across all positions
- `DAILY_LOSS_LIMIT_PCT` — pauses agent if breached
- `KILL_SWITCH_FILE` — presence of `/tmp/meteora-killswitch` halts all writes
- `DRY_RUN=true` — default; must be explicitly disabled to send mainnet txs

## 11-day build plan

| Day | Deliverable |
|---|---|
| 1–2 | Discovery engine + scoring |
| 3–4 | Position manager (devnet) |
| 5–6 | Rebalance loop + safety rails |
| 7   | Backtest + PnL tracking |
| 8   | Dashboard |
| 9   | Mainnet run, capture real txs |
| 10  | Pitch + technical demo videos |
| 11  | Submit |

## Submission deliverables

- [ ] GitHub repo public, README polished
- [ ] Pitch video (≤ 3 min) — problem, solution, traction, ask
- [ ] Technical demo video (≤ 3 min) — architecture, code, live agent
- [ ] Submission form on colosseum.com/frontier
