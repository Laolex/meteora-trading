import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Nav from "@/components/ui/Nav"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Meteora Agent — Autonomous DLMM Liquidity",
  description:
    "A safety-first autonomous agent for Meteora DLMM liquidity positions on Solana. Colosseum Solana Frontier Hackathon 2026.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
