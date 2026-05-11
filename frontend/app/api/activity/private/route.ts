import { NextRequest, NextResponse } from "next/server"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const NGROK_HEADERS: Record<string, string> = API_BASE.includes("ngrok")
  ? { "ngrok-skip-browser-warning": "true" }
  : {}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 })
  }

  const limit = req.nextUrl.searchParams.get("limit") ?? "20"
  const upstream = `${API_BASE}/activity/private?limit=${encodeURIComponent(limit)}`

  try {
    const res = await fetch(upstream, {
      headers: {
        Authorization: authHeader,
        ...NGROK_HEADERS,
      },
      cache: "no-store",
    })

    const payload = await res.json().catch(() => [])
    if (!res.ok) {
      return NextResponse.json(payload, { status: res.status })
    }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ detail: "Activity upstream unavailable" }, { status: 502 })
  }
}
