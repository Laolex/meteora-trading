// All functions return mock data now.
// To connect real data: replace each mock return with fetch(`${API_BASE}/...`)
// API_BASE = process.env.NEXT_PUBLIC_API_URL (FastAPI dashboard server)

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export type Mode = "DRY_RUN" | "LIVE"
export type Network = "devnet" | "mainnet"
export type ServiceStatus = "active" | "inactive" | "failed"
export type PositionStatus = "open" | "rebalancing" | "exiting" | "closed"
export type ActionType = "open" | "close" | "rebalance" | "claim" | "exit"

export interface AgentStatus {
  mode: Mode
  network: Network
  walletPubkey: string
  serviceStatus: ServiceStatus
  killSwitchPresent: boolean
  liveGatePass: boolean
  dryRun: boolean
}

export interface Position {
  id: string
  poolName: string
  poolAddress: string
  depositedValueUsd: number
  feesEarnedUsd: number
  status: PositionStatus
  openedAt: string
}

export interface KpiSummary {
  openPositions: number
  dailyFeesUsd: number
  totalDeployedUsd: number
  pnlDayUsd: number
  pnlWeekUsd: number
  maxPositionUsd: number
  maxTotalDeployedUsd: number
  dailyLossLimitPct: number
  dailyLossCurrentPct: number
}

export interface ActivityItem {
  id: number
  positionId: string | null
  poolAddress: string
  poolName: string
  actionType: ActionType
  reason: string
  decidedAt: string
  executedAt: string | null
  txSignature: string | null
  success: boolean | null
}

export interface RiskUtilization {
  positionUtilPct: number
  totalDeployedUtilPct: number
  dailyLossGuardStatus: "ok" | "warning" | "tripped"
}

export interface SafetyConfig {
  dryRun: boolean
  killSwitchPresent: boolean
  killSwitchPath: string
  liveGatePass: boolean
  maxPositionUsd: number
  maxTotalDeployedUsd: number
  dailyLossLimitPct: number
  maxOpenPositions: number
  network: Network
}

export interface MarketSnapshot {
  solPriceUsd: number
  ongoingTrades: number
  updatedAt: string
}

// --- Mock data ---

export async function getAgentStatus(): Promise<AgentStatus> {
  // TODO: replace with fetch(`${API_BASE}/status`)
  return {
    mode: "DRY_RUN",
    network: "devnet",
    walletPubkey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    serviceStatus: "active",
    killSwitchPresent: false,
    liveGatePass: true,
    dryRun: true,
  }
}

export async function getKpiSummary(): Promise<KpiSummary> {
  // TODO: replace with fetch(`${API_BASE}/kpi`)
  return {
    openPositions: 1,
    dailyFeesUsd: 3.42,
    totalDeployedUsd: 100.0,
    pnlDayUsd: 2.17,
    pnlWeekUsd: 8.94,
    maxPositionUsd: 200,
    maxTotalDeployedUsd: 500,
    dailyLossLimitPct: 5,
    dailyLossCurrentPct: 0,
  }
}

export async function getActivity(limit = 20): Promise<ActivityItem[]> {
  // TODO: replace with fetch(`${API_BASE}/activity?limit=${limit}`)
  const activity: ActivityItem[] = [
    {
      id: 1,
      positionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      poolAddress: "EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKtnMDFm",
      poolName: "SOL-USDC",
      actionType: "open",
      reason: "top-scored pool, bins in range",
      decidedAt: "2026-05-05T01:00:00Z",
      executedAt: "2026-05-05T01:00:02Z",
      txSignature: null,
      success: true,
    },
    {
      id: 2,
      positionId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      poolAddress: "EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKtnMDFm",
      poolName: "SOL-USDC",
      actionType: "claim",
      reason: "fee accumulation threshold reached",
      decidedAt: "2026-05-05T02:15:00Z",
      executedAt: null,
      txSignature: null,
      success: null,
    },
    {
      id: 3,
      positionId: null,
      poolAddress: "EGZ7tiLeH62TPV1gL8WwbXGzEPa9zmcpVnnkPKtnMDFm",
      poolName: "SOL-USDC",
      actionType: "rebalance",
      reason: "drift > 200 bps from entry",
      decidedAt: "2026-05-05T03:30:00Z",
      executedAt: null,
      txSignature: null,
      success: null,
    },
  ]
  return activity.slice(0, limit)
}

export async function getRiskUtilization(): Promise<RiskUtilization> {
  // TODO: replace with fetch(`${API_BASE}/risk`)
  return {
    positionUtilPct: 50,
    totalDeployedUtilPct: 20,
    dailyLossGuardStatus: "ok",
  }
}

export async function getSafetyConfig(): Promise<SafetyConfig> {
  // TODO: replace with fetch(`${API_BASE}/safety`)
  return {
    dryRun: true,
    killSwitchPresent: false,
    killSwitchPath: "/opt/meteora-agent/var/kill",
    liveGatePass: true,
    maxPositionUsd: 200,
    maxTotalDeployedUsd: 500,
    dailyLossLimitPct: 5,
    maxOpenPositions: 1,
    network: "devnet",
  }
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    { cache: "no-store" },
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch SOL price: ${response.status}`)
  }

  const data = (await response.json()) as { solana?: { usd?: number } }
  const solPriceUsd = data.solana?.usd

  if (typeof solPriceUsd !== "number") {
    throw new Error("Invalid SOL price payload")
  }

  const activity = await getActivity(50)
  const ongoingTrades = activity.filter((item) => item.success === null).length

  return {
    solPriceUsd,
    ongoingTrades,
    updatedAt: new Date().toISOString(),
  }
}

export { API_BASE }
