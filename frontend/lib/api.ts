// Fetches real data from the FastAPI dashboard server when NEXT_PUBLIC_API_URL is set,
// otherwise falls back to mock data for local UI development.

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

export interface WalletBalance {
  address: string
  solBalance: number
  usdcBalance: number
  usdcMint: string
}

async function apiFetch<T>(path: string, fallback: T): Promise<T> {
  if (!process.env.NEXT_PUBLIC_API_URL) return fallback
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  return res.json() as Promise<T>
}

// --- Mock fallbacks (used when NEXT_PUBLIC_API_URL is not set) ---

const MOCK_STATUS: AgentStatus = {
  mode: "DRY_RUN",
  network: "devnet",
  walletPubkey: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  serviceStatus: "active",
  killSwitchPresent: false,
  liveGatePass: true,
  dryRun: true,
}

const MOCK_KPI: KpiSummary = {
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

const MOCK_ACTIVITY: ActivityItem[] = [
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
]

const MOCK_RISK: RiskUtilization = {
  positionUtilPct: 50,
  totalDeployedUtilPct: 20,
  dailyLossGuardStatus: "ok",
}

const MOCK_SAFETY: SafetyConfig = {
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

const MOCK_WALLET_BALANCE: WalletBalance = {
  address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  solBalance: 0.42,
  usdcBalance: 87.5,
  usdcMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
}

// --- API functions ---

export async function getAgentStatus(): Promise<AgentStatus> {
  return apiFetch("/status", MOCK_STATUS)
}

export async function getKpiSummary(): Promise<KpiSummary> {
  return apiFetch("/kpi", MOCK_KPI)
}

export async function getActivity(limit = 20): Promise<ActivityItem[]> {
  return apiFetch(`/activity?limit=${limit}`, MOCK_ACTIVITY)
}

export async function getRiskUtilization(): Promise<RiskUtilization> {
  return apiFetch("/risk", MOCK_RISK)
}

export async function getSafetyConfig(): Promise<SafetyConfig> {
  return apiFetch("/safety", MOCK_SAFETY)
}

export async function getWalletBalance(): Promise<WalletBalance> {
  return apiFetch("/wallet/balance", MOCK_WALLET_BALANCE)
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
