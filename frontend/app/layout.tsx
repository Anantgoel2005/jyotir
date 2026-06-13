"use client"
import React from "react"

import { Inter, Playfair_Display } from "next/font/google"
import { LangProvider, useLang } from "@/lib/lang"
import { Sparkles, Globe } from "lucide-react"
import { Footer } from "@/components/Footer"
import { BackToTop } from "@/components/BackToTop"
import { ToastProvider } from "@/components/Toast"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
})

function Header() {
  const { lang, setLang, t } = useLang()
  return (
    <header className="border-b border-white/5 backdrop-blur-sm relative z-20 header-glow">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 via-gold-400 to-amber-600 flex items-center justify-center text-sm font-bold group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-500 sanskrit-glow">
            <span className="text-white text-lg" style={{ fontFamily: "serif" }}>ॐ</span>
          </div>
          <span
            className="text-xl font-semibold tracking-wide text-gold-spiritual"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            Jyotir
          </span>
        </a>
        <nav className="flex items-center gap-4 text-sm">
          <span className="hidden sm:flex items-center gap-4 text-zinc-500">
            <span className="hover:text-amber-400 transition-colors cursor-default">Tropical</span>
            <span className="text-zinc-700">·</span>
            <span className="hover:text-amber-400 transition-colors cursor-default">Vedic</span>
            <span className="text-zinc-700">·</span>
            <span className="hover:text-amber-400 transition-colors cursor-default">Bazi</span>
          </span>
          <button
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/20 hover:border-amber-400/40 hover:bg-amber-400/5 text-xs text-zinc-400 hover:text-amber-300 transition-all duration-300"
            title={lang === "en" ? "हिन्दी में बदलें" : "Switch to English"}
          >
            <Globe className="w-3 h-3" />
            <span className="font-medium">{lang === "en" ? "हि" : "EN"}</span>
          </button>
        </nav>
      </div>
    </header>
  )
}

function Starfield() {
  return (
    <>
      {/* Deep space gradient — warmer tones */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-indigo-950/30 to-[#08081a]" />

      {/* Mandala watermark — top right */}
      <div className="mandala-watermark" style={{ top: "-5%", right: "-10%" }}>ॐ</div>
      <div className="mandala-watermark" style={{ bottom: "-8%", left: "-5%", opacity: "0.02" }}>ॐ</div>

      {/* Animated stars */}
      <div className="fixed inset-0 -z-10">
        <div className="stars-small" />
        <div className="stars-medium" />
        <div className="stars-large" />
      </div>

      {/* Cosmic dust / nebula — warmer */}
      <div className="fixed inset-0 -z-10 opacity-20">
        <div className="cosmic-dust cosmic-dust-1" />
        <div className="cosmic-dust cosmic-dust-2" />
        <div className="cosmic-dust cosmic-dust-3" />
      </div>

      {/* Floating lotus petals (decorative particles) */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute text-amber-400/10 text-2xl" style={{ top: "15%", left: "10%", animation: "lotus-float 8s ease-in-out infinite" }}>✿</div>
        <div className="absolute text-amber-400/8 text-xl" style={{ top: "60%", right: "12%", animation: "lotus-float 10s ease-in-out infinite 2s" }}>✿</div>
        <div className="absolute text-purple-400/10 text-lg" style={{ top: "35%", left: "75%", animation: "lotus-float 9s ease-in-out infinite 4s" }}>✿</div>
        <div className="absolute text-amber-400/6 text-2xl" style={{ top: "80%", left: "35%", animation: "lotus-float 11s ease-in-out infinite 1s" }}>✿</div>
      </div>
    </>
  )
}


function MouseGlow() {
  const [mounted, setMounted] = React.useState(false)
  const [pos, setPos] = React.useState({ x: -500, y: -500 })
  React.useEffect(() => {
    setMounted(true)
    const move = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", move)
    return () => window.removeEventListener("mousemove", move)
  }, [])
  if (!mounted) return null
  return (
    <div
      className="mouse-glow hidden md:block"
      style={{ left: pos.x, top: pos.y }}
    />
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${playfair.variable} font-sans min-h-screen`}>
        <LangProvider>
          <Starfield />
          <Header />
          <main className="max-w-6xl mx-auto relative z-10">
            {children}
          </main>
          <BackToTop />
          <Footer />
          {/* Mouse glow tracker */}
          <MouseGlow />
        </LangProvider>
      </body>
    </html>
  )
}
