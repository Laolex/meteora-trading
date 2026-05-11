import { NextResponse } from "next/server"

export const revalidate = 30

export async function GET() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana,meteora&vs_currencies=usd",
      { next: { revalidate: 30 } },
    )
    if (!res.ok) {
      return NextResponse.json({ solana: null, meteora: null }, { status: 200 })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ solana: null, meteora: null }, { status: 200 })
  }
}
