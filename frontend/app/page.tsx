"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Clock3, LockKeyhole, Orbit, Sparkles } from "lucide-react"
import { BirthWizard } from "@/components/BirthWizard"
import { listCharts } from "@/lib/api"
import type { AstroSystem, ChartSummary } from "@/lib/types"
import { useLang } from "@/lib/lang"

const systems: { id: AstroSystem; glyph: string; number: string }[] = [
  { id: "tropical", glyph: "☉", number: "01" },
  { id: "vedic", glyph: "ॐ", number: "02" },
  { id: "bazi", glyph: "天", number: "03" },
]

export default function Home() {
  const { t } = useLang()
  const [wizard, setWizard] = useState(false)
  const [selected, setSelected] = useState<AstroSystem>()
  const [recent, setRecent] = useState<ChartSummary[]>([])

  useEffect(() => {
    listCharts().then((items) => setRecent(items.slice(0, 3))).catch(() => {})
  }, [])

  const open = (system?: AstroSystem) => {
    setSelected(system)
    setWizard(true)
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><span />{t("eyebrow")}</p>
          <h1>{t("hero")}</h1>
          <p className="hero-body">{t("heroBody")}</p>
          <div className="hero-actions">
            <button className="button primary large" onClick={() => open()}>{t("begin")} <ArrowRight size={17} /></button>
            <span className="quiet-proof"><LockKeyhole size={15} /> {t("noAccount")}</span>
          </div>
        </div>
        <CelestialHero />
        <div className="hero-index"><span>EST.</span><strong>MMXXVI</strong></div>
      </section>

      {recent.length > 0 && (
        <section className="recent-strip">
          <div className="section-heading compact"><p className="section-kicker"><Clock3 size={13} /> {t("recent")}</p></div>
          <div className="recent-list">
            {recent.map((chart) => (
              <Link href={`/readings/${chart.id}`} key={chart.id}>
                <span className={`mini-glyph ${chart.system}`}>{systems.find((s) => s.id === chart.system)?.glyph}</span>
                <span><strong>{chart.person_name}</strong><small>{t(chart.system)} · {chart.birth_city}</small></span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="traditions-section" id="traditions">
        <div className="section-heading">
          <p className="section-kicker">{t("lenses")}</p>
          <h2>{t("traditions")}</h2>
        </div>
        <div className="tradition-grid">
          {systems.map((system) => (
            <article className={`tradition-card ${system.id}`} key={system.id}>
              <div className="card-number">{system.number}</div>
              <div className="tradition-glyph" aria-hidden="true">{system.glyph}</div>
              <p>{t(`${system.id}Sub` as any)}</p>
              <h3>{t(system.id)}</h3>
              <div className="hairline" />
              <p className="description">{t(`${system.id}Desc` as any)}</p>
              <button onClick={() => open(system.id)}>{t("select")} <ArrowRight size={15} /></button>
            </article>
          ))}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-intro">
          <p className="section-kicker">{t("process")}</p>
          <h2>{t("how")}</h2>
          <p>{t("methodIntro")}</p>
        </div>
        <div className="method-steps">
          {[
            [Orbit, "01", t("step1"), t("step1Body")],
            [Clock3, "02", t("step2"), t("step2Body")],
            [Sparkles, "03", t("step3"), t("step3Body")],
          ].map(([Icon, number, title, body]: any) => (
            <div className="method-step" key={number}>
              <Icon size={20} />
              <small>{number}</small>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="privacy-banner">
        <div className="privacy-seal"><LockKeyhole size={25} /></div>
        <div><p className="section-kicker">{t("private")}</p><h2>{t("privateBody")}</h2></div>
        <button className="button secondary" onClick={() => open()}>{t("begin")} <ArrowRight size={16} /></button>
      </section>

      <BirthWizard open={wizard} initialSystem={selected} onClose={() => setWizard(false)} />
    </>
  )
}

function CelestialHero() {
  return (
    <div className="celestial-hero" aria-hidden="true">
      <div className="orbit orbit-one"><i /><i /><i /></div>
      <div className="orbit orbit-two"><i /><i /></div>
      <div className="orbit orbit-three" />
      <div className="hero-sun">☉</div>
      <span className="zodiac z1">♈</span><span className="zodiac z2">♎</span>
      <span className="zodiac z3">♓</span><span className="zodiac z4">♌</span>
      <div className="axis-line" />
      <p>AS ABOVE<br />SO WITHIN</p>
    </div>
  )
}
