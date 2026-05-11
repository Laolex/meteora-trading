-- Meteora DLMM Agent — Postgres schema

CREATE TABLE IF NOT EXISTS pools (
    address TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    token_x_mint TEXT NOT NULL,
    token_y_mint TEXT NOT NULL,
    bin_step INTEGER NOT NULL,
    base_fee_pct DOUBLE PRECISION NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_snapshots (
    id BIGSERIAL PRIMARY KEY,
    pool_address TEXT NOT NULL REFERENCES pools(address),
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tvl_usd DOUBLE PRECISION NOT NULL,
    volume_24h_usd DOUBLE PRECISION NOT NULL,
    fees_24h_usd DOUBLE PRECISION NOT NULL,
    current_price DOUBLE PRECISION NOT NULL,
    active_bin_id INTEGER NOT NULL,
    fee_apr DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pool_snapshots_pool_time
    ON pool_snapshots(pool_address, captured_at DESC);

CREATE TABLE IF NOT EXISTS pool_scores (
    id BIGSERIAL PRIMARY KEY,
    pool_address TEXT NOT NULL REFERENCES pools(address),
    scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score DOUBLE PRECISION NOT NULL,
    component_fees_24h DOUBLE PRECISION NOT NULL,
    component_volume_tvl DOUBLE PRECISION NOT NULL,
    component_token_quality DOUBLE PRECISION NOT NULL,
    component_bin_liquidity DOUBLE PRECISION NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pool_scores_time ON pool_scores(scored_at DESC);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY,
    pool_address TEXT NOT NULL REFERENCES pools(address),
    pool_name TEXT NOT NULL,
    lower_bin_id INTEGER NOT NULL,
    upper_bin_id INTEGER NOT NULL,
    deposited_x DOUBLE PRECISION NOT NULL,
    deposited_y DOUBLE PRECISION NOT NULL,
    deposited_value_usd DOUBLE PRECISION NOT NULL,
    fees_earned_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    fees_earned_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    fees_earned_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    opened_at TIMESTAMPTZ NOT NULL,
    last_rebalanced_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('open', 'rebalancing', 'exiting', 'closed')),
    tx_signature_open TEXT NOT NULL,
    tx_signature_close TEXT
);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

CREATE TABLE IF NOT EXISTS actions_log (
    id BIGSERIAL PRIMARY KEY,
    position_id UUID REFERENCES positions(id),
    pool_address TEXT NOT NULL,
    action_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ,
    tx_signature TEXT,
    success BOOLEAN,
    error_message TEXT,
    is_dry_run BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_actions_log_time ON actions_log(decided_at DESC);

CREATE TABLE IF NOT EXISTS pnl_daily (
    day DATE PRIMARY KEY,
    starting_value_usd DOUBLE PRECISION NOT NULL,
    ending_value_usd DOUBLE PRECISION,
    fees_collected_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    gas_spent_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    rebalance_count INTEGER NOT NULL DEFAULT 0
);
