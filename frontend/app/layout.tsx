import type { Metadata } from "next"
import { Space_Grotesk, Space_Mono } from "next/font/google"
import "./globals.css"
import Nav from "@/components/ui/Nav"
import GlobalSidebar from "@/components/ui/GlobalSidebar"
import GlobalParticles from "@/components/ui/GlobalParticles"
import FootnoteTicker from "@/components/ui/FootnoteTicker"
import SolanaWalletProvider from "@/components/ui/WalletProvider"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
})

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://meteora-agent.vercel.app"),
  title: "Meteora Agent — Autonomous DLMM Liquidity",
  description:
    "A safety-first autonomous agent for Meteora DLMM liquidity positions on Solana. Colosseum Solana Frontier Hackathon 2026.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Meteora Agent — Autonomous DLMM Liquidity",
    description: "Safety-first autonomous agent for Meteora DLMM on Solana. Colosseum 2026.",
    images: [{ url: "/dashboard-preview.png", width: 1440, height: 761 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen antialiased relative">
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 app-bg" />
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 app-grain" />
        <GlobalParticles />
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
