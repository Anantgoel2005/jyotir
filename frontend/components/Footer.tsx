"use client"
import React from "react"

import { useLang } from "@/lib/lang"

const quotes = {
  en: [
    '"The cosmos is within us. We are made of star-stuff." — Carl Sagan',
    '"As above, so below. As within, so without." — Hermes Trismegistus',
    '"Not only are we in the universe, the universe is in us." — Neil deGrasse Tyson',
  ],
  hi: [
    '"यथा पिण्डे तथा ब्रह्माण्डे" — जैसा शरीर में, वैसा ब्रह्मांड में',
    '"वसुधैव कुटुम्बकम्" — संपूर्ण विश्व एक परिवार है',
    '"अहं ब्रह्मास्मि" — मैं ब्रह्म हूं',
  ],
}

export function Footer() {
  const { lang, t } = useLang()
  const qs = quotes[lang] || quotes.en
  const [quote, setQuote] = React.useState(qs[0])  // stable initial value
  React.useEffect(() => {
    setQuote(qs[Math.floor(Math.random() * qs.length)])
  }, [lang])

  return (
    <footer className="border-t border-amber-500/5 mt-16 relative">
      {/* Decorative Om */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 text-amber-400/10 text-2xl font-serif select-none">ॐ</div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Quote */}
          <p className="text-xs text-zinc-600 italic max-w-md leading-relaxed" suppressHydrationWarning>
            {quote}
          </p>

          {/* Links */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-700">
            <span className="text-amber-400/30 font-serif">ॐ</span>
            <span>Tropical · Vedic · Bazi</span>
            <span className="text-amber-400/30 font-serif">ॐ</span>
            <span>Powered by OpenRouter</span>
            <span className="text-amber-400/30 font-serif">ॐ</span>
          </div>

          {/* Brand */}
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <span className="font-serif text-amber-400/40">ॐ</span>
            <span style={{ fontFamily: "var(--font-playfair)" }}>Jyotir</span>
            <span>— {t("tagline")}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
