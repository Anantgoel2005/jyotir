import type { Metadata } from "next"
import { LangProvider } from "@/lib/lang"
import { SiteChrome } from "@/components/SiteChrome"
import "./globals.css"

export const metadata: Metadata = {
  title: "Jyotir — Private Astrology Reading Studio",
  description: "Tropical, Vedic, and Bazi birth-chart readings in a private celestial studio.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <SiteChrome>{children}</SiteChrome>
        </LangProvider>
      </body>
    </html>
  )
}
