# Meteora DLMM Autonomous Agent

<p align="center">
  <img src="https://img.shields.io/badge/Autonomous_LP_Agent-7aa2f7?style=for-the-badge" alt="category"/>
  <img src="https://img.shields.io/badge/Dry--run_by_default-00C853?style=for-the-badge" alt="safe"/>
  <img src="https://img.shields.io/badge/License-MIT-bb9af7?style=for-the-badge" alt="MIT"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white"/>
  <img src="https://img.shields.io/badge/Anchor-2A2A2A?style=flat-square"/>
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/Solana-9945FF?style=flat-square&logo=solana&logoColor=white"/>
  <img src="https://img.shields.io/badge/Claude_API-D97757?style=flat-square&logo=anthropic&logoColor=white"/>
</p>


Autonomous discovery, rebalancing, and AI-tuned liquidity management for Meteora DLMM positions on Solana.

**Submission:** Colosseum Solana Frontier Hackathon (April 6 – May 11, 2026)  
**Live dashboard:** https://meteora-agent.vercel.app

---

## Thesis

90% of LPs lose money to impermanent loss and out-of-range positions. Manual DLMM management is brutal — pools shift, bins move, fees compound only when positions stay active. This agent runs the entire loop autonomously, and unlike static bots it adapts: bin width scales with realized volatility, and an LLM recalibrates risk thresholds every hour based on the live market regime.

---

## What makes it different

### 1. Adaptive range sizing
Bin width is computed from 24h realized volatility on every position open:

```
width = base_width × (vol_24h / reference_vol)   [clamped 10–120 bins]
```

Low vol → tight range → more concentrated liquidity → higher fee yield per dollar.  
High vol → wide range → lower IL risk → position stays in range longer.

### 2. LLM parameter tuner
Claude Haiku is called once per hour with the current market state (vol regime, fee APR, drift distance, rebalance count). It returns adjusted `rebalance_drift_bps` and `exit_volatility_24h_pct` as JSON. The agent self-calibrates instead of running on hardcoded thresholds.

The tuner is operator-toggleable from the dashboard (on/off with a single click after wallet connect). Falls back to config defaults silently on any API failure — the loop never blocks.

### 3. On-chain decision receipts
Every REBALANCE, EXIT, and CLAIM writes a compact memo to Solana via the SPL Memo program:

```
METEORA|v1|action=rebalance|pool=CvzNkYLz|out of range (active=24, range=-20..20)
```

Every decision is verifiable on Solscan. No trust required.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  DISCOVERY LAYER                                                │
│  Meteora API → pool universe → fee/vol/TVL scoring → ranked    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  AI LAYER                                                       │
│  adaptive.py  → volatility-driven bin width per open           │
│  tuner.py     → Claude Haiku recalibrates thresholds hourly    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  DECISION ENGINE                                                │
│  DecisionContext → decide() → HOLD / CLAIM / REBALANCE / EXIT  │
│  guards.py → size cap, total cap, daily loss limit, kill switch │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  POSITION MANAGER + EXECUTOR                                    │
│  node-helper (Meteora DLMM SDK) → hot wallet → Solana RPC      │
│  memo.py → SPL Memo receipt after every non-HOLD action        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  PERSISTENCE + DASHBOARD                                        │
│  Postgres (asyncpg) → FastAPI → Next.js dashboard              │
│  Fee accumulation, mark-to-market, PnL tracking each loop      │
└─────────────────────────────────────────────────────────────────┘
```

## Module map

| Path | Purpose |
|---|---|
| `src/discovery/` | Pull pools from Meteora API, score and rank by fee yield |
| `src/rebalance/decision.py` | Core decision tree: HOLD / CLAIM / REBALANCE / EXIT |
| `src/rebalance/adaptive.py` | Volatility-driven bin-width sizing |
| `src/rebalance/tuner.py` | LLM parameter tuner (Claude Haiku, hourly) |
| `src/rebalance/memo.py` | On-chain receipts via SPL Memo program |
| `src/rebalance/guards.py` | Safety rails — size, deployed, daily loss, kill switch |
| `src/position/` | Position state model, open/close via node-helper |
| `src/db/` | Postgres persistence — asyncpg pool, full CRUD, fee accumulation |
| `src/dashboard/` | FastAPI — status, KPI, activity, risk, agent state, LLM toggle |
| `src/vault/` | On-chain Anchor vault — sweep idle capital, top-up from vault |
| `node-helper/` | Signs and broadcasts Meteora DLMM SDK transactions |
| `sql/` | Schema migrations |
| `frontend/` | Next.js dashboard — live positions, PnL, LLM tuner state |
| `tests/` | 53 unit tests, all passing |

---

## Quick start

```bash
cp .env.example .env
# Fill in: HELIUS_API_KEY, DATABASE_URL, HOT_WALLET_KEYPAIR_PATH

docker compose up -d postgres
psql $DATABASE_URL -f sql/001_initial_schema.sql

pip install -e ".[dev]"
python -m pytest -q                        # 53 tests

python -m src.main --mode=discovery        # one-shot pool scan
python -m src.main --mode=run              # autonomous loop (DRY_RUN=true by default)
python -m src.main --mode=dashboard        # FastAPI on :8000
```

## Environment variables

```bash
# Core
HELIUS_API_KEY=...
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}
HOT_WALLET_KEYPAIR_PATH=/path/to/keypair.json
DATABASE_URL=postgresql://...

# Mode
DRY_RUN=false          # set true to simulate without sending txs
NETWORK=mainnet        # devnet | mainnet

# AI features
ANTHROPIC_API_KEY=...  # optional — enables LLM parameter tuner
LLM_TUNE_INTERVAL_SECONDS=3600

# Adaptive range
ADAPTIVE_RANGE_REFERENCE_VOL_PCT=5.0
ADAPTIVE_RANGE_MIN_BINS=10
ADAPTIVE_RANGE_MAX_BINS=120

# Safety rails
MAX_POSITION_USD=100
MAX_TOTAL_DEPLOYED_USD=500
DAILY_LOSS_LIMIT_PCT=10
KILL_SWITCH_FILE=/tmp/meteora-killswitch
LLM_DISABLED_FILE=/tmp/meteora-llm-disabled

# Rebalance thresholds (overridden by LLM tuner when active)
REBALANCE_DRIFT_BPS=50
REBALANCE_MIN_FEES_USD=0.10
EXIT_VOLATILITY_24H_PCT=30
```

## Safety rails

All guards are fail-closed and checked before every transaction:

| Guard | Behaviour |
|---|---|
| `MAX_POSITION_USD` | Rejects any open exceeding this size |
| `MAX_TOTAL_DEPLOYED_USD` | Rejects if portfolio would exceed global cap |
| `DAILY_LOSS_LIMIT_PCT` | Pauses agent if today's loss exceeds threshold |
| `KILL_SWITCH_FILE` | `touch /tmp/meteora-killswitch` halts all writes instantly |
| `LLM_DISABLED_FILE` | `touch /tmp/meteora-llm-disabled` disables LLM tuner |
| `DRY_RUN=true` | Simulates everything, no txs sent — default |

## VPS deployment (systemd)

```ini
# /etc/systemd/system/meteora-agent.service
[Service]
WorkingDirectory=/opt/meteora-agent
ExecStart=/opt/meteora-agent/.venv/bin/python -m src.main --mode run
Restart=on-failure
```

```bash
systemctl enable --now meteora-agent
journalctl -u meteora-agent -f
```

## Agent wallet

`9fXLvgjnfngxKCusuv7AGchM3JsnreMtF1YBBKpwsibr`

