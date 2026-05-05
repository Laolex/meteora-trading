import type { Metadata } from "next"
import "./globals.css"
import Nav from "@/components/ui/Nav"
import GlobalSidebar from "@/components/ui/GlobalSidebar"
import FootnoteTicker from "@/components/ui/FootnoteTicker"
import SolanaWalletProvider from "@/components/ui/WalletProvider"

export const metadata: Metadata = {
  title: "Meteora Agent — Autonomous DLMM Liquidity",
  description:
    "A safety-first autonomous agent for Meteora DLMM liquidity positions on Solana. Colosseum Solana Frontier Hackathon 2026.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased relative">
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 app-bg" />
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 app-grain" />
        <SolanaWalletProvider>
          <Nav />
          <GlobalSidebar />
          <FootnoteTicker />
          <main className="app-main">{children}</main>
        </SolanaWalletProvider>
      </body>
    </html>
  )
}
