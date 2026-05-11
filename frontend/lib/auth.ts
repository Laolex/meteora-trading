import { API_BASE } from "./api"
import bs58 from "bs58"

export { API_BASE }

const NGROK_HEADERS: Record<string, string> = API_BASE.includes("ngrok")
  ? { "ngrok-skip-browser-warning": "true" }
  : {}

export async function fetchNonce(pubkey: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/nonce?pubkey=${encodeURIComponent(pubkey)}`, {
    headers: NGROK_HEADERS,
  })
  if (!res.ok) throw new Error(`fetchNonce failed: ${res.status}`)
  const data = await res.json()
  return data.nonce as string
}

export async function verifyWallet(
  pubkey: string,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>
): Promise<void> {
  const nonce = await fetchNonce(pubkey)
  const msgBytes = new TextEncoder().encode(nonce)
  const signatureBytes = await signMessage(msgBytes)
  const signature = bs58.encode(signatureBytes)

  const res = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...NGROK_HEADERS },
    body: JSON.stringify({ pubkey, signature, nonce }),
  })
  if (!res.ok) throw new Error(`verifyWallet failed: ${res.status}`)
  const data = await res.json()
  const token = data.token as string

  if (typeof window !== "undefined") {
    sessionStorage.setItem("meteora_jwt", token)
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("meteora_jwt")
}

export function clearToken(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem("meteora_jwt")
}

export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return false
    // Pad base64 if needed
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    const decoded = JSON.parse(atob(padded)) as { exp?: number }
    if (decoded.exp && decoded.exp < Date.now() / 1000) return false
    return true
  } catch {
    return false
  }
}

export async function adminKillSwitch(arm: boolean): Promise<{ ok: boolean; armed: boolean }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await fetch(`${API_BASE}/admin/kill-switch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ arm }),
  })
  if (!res.ok) throw new Error(`adminKillSwitch failed: ${res.status}`)
  return res.json() as Promise<{ ok: boolean; armed: boolean }>
}

export async function adminToggleLlm(enable: boolean): Promise<{ ok: boolean; enabled: boolean }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(`${API_BASE}/admin/llm-toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ enable }),
  })
  if (!res.ok) throw new Error(`llm-toggle failed: ${res.status}`)
  return res.json() as Promise<{ ok: boolean; enabled: boolean }>
}

export async function adminWithdraw(
  amountSol: number,
  amountUsdc: number,
): Promise<{ ok: boolean; txSignature: string }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await fetch(`${API_BASE}/admin/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ amountSol, amountUsdc }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error((err as { detail?: string }).detail ?? `withdraw failed: ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean; txSignature: string }>
}

export async function adminUpdateConfig(params: {
  maxPositionUsd?: number
  maxTotalDeployedUsd?: number
  dailyLossPct?: number
  maxOpenPositions?: number
  exitVolatilityPct?: number
}): Promise<{ ok: boolean }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(`${API_BASE}/admin/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error((err as { detail?: string }).detail ?? `config update failed: ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean }>
}

export async function adminSetLlmKey(apiKey: string, provider: "anthropic" | "openai" = "anthropic"): Promise<{ ok: boolean; provider: string }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(`${API_BASE}/admin/llm-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ apiKey, provider }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error((err as { detail?: string }).detail ?? `llm-key failed: ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean; provider: string }>
}

export async function vaultManagerWithdraw(
  amountUsdc: number,
): Promise<{ ok: boolean; signature: string }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await fetch(`${API_BASE}/vault/manager-withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ amountUsdc }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error((err as { detail?: string }).detail ?? `withdraw failed: ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean; signature: string }>
}

export async function vaultManagerReturn(
  amountUsdc: number,
): Promise<{ ok: boolean; signature: string }> {
  const token = getToken()
  if (!token) throw new Error("Not authenticated")

  const res = await fetch(`${API_BASE}/vault/manager-return`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...NGROK_HEADERS,
    },
    body: JSON.stringify({ amountUsdc }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error((err as { detail?: string }).detail ?? `return failed: ${res.status}`)
  }
  return res.json() as Promise<{ ok: boolean; signature: string }>
}
