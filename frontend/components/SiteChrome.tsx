"use client"

import Link from "next/link"
import { Languages, LockKeyhole, Sparkles } from "lucide-react"
import { useLang } from "@/lib/lang"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useLang()
  return (
    <div className="site-shell">
      <div className="sky-texture" aria-hidden="true" />
      <header className="site-header">
        <Link href="/" className="wordmark" aria-label="Jyotir home">
          <span className="wordmark-seal">ज्यो</span>
          <span>Jyotir</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          <Link href="/#traditions">{t("navStudio")}</Link>
          <Link href="/#method">{t("navMethod")}</Link>
          <button
            className="language-button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            aria-label={lang === "en" ? "हिंदी में बदलें" : "Switch to English"}
          >
            <Languages size={15} />
            {lang === "en" ? "हिं" : "EN"}
          </button>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <div className="wordmark footer-mark"><span className="wordmark-seal">ज्यो</span><span>Jyotir</span></div>
          <p>{t("reflection")}</p>
        </div>
        <div className="footer-notes">
          <span><LockKeyhole size={14} /> {t("footerPrivacy")}</span>
          <span><Sparkles size={14} /> {t("footerSystems")}</span>
        </div>
      </footer>
    </div>
  )
}
