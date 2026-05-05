import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import Nav from "@/components/ui/Nav"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "Meteora Agent — Autonomous DLMM Liquidity",
  description:
    "A safety-first autonomous agent for Meteora DLMM liquidity positions on Solana. Colosseum Solana Frontier Hackathon 2026.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  )
}
