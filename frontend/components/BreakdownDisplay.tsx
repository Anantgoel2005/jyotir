"use client"

import type { ReactNode } from "react"
import { useToast } from "@/components/Toast"

import { Download, Share2, Sparkles } from "lucide-react"
import { Chart } from "@/lib/types"
import { ScrollReveal } from "@/components/ScrollReveal"
import { MandalaChartWheel } from "@/components/MandalaChartWheel"
import { Cosmogram } from "@/components/Cosmogram"
import { BaziPentagon } from "@/components/BaziPentagon"
import { ReadingMeta } from "@/components/ReadingMeta"
import { ErrorBoundary } from "@/components/ErrorBoundary"

// ── Badge color maps ──────────────────────────────
const PLANET_COLORS: Record<string, string> = {
  sun: "#fbbf24", moon: "#c4b5fd", mercury: "#67e8f9", venus: "#f9a8d4",
  mars: "#f87171", jupiter: "#fde68a", saturn: "#94a3b8",
  rahu: "#818cf8", ketu: "#c084fc", ascendant: "#fb923c",
  surya: "#fbbf24", chandra: "#c4b5fd", budha: "#67e8f9", shukra: "#f9a8d4",
  mangal: "#f87171", guru: "#fde68a", shani: "#94a3b8",
}

const SECTION_ICONS: Record<string, string> = {
  overview: "🌌", planetary: "🪐", graha: "🪐", planets: "🪐",
  houses: "🏛️", bhava: "🏛️", aspects: "✨", nakshatra: "⭐",
  dasha: "⏳", timing: "⏳", trajectory: "🌅", karmic: "🕉️",
  remedies: "🌿", upaya: "🌿", embodiment: "🌿", guidance: "🌿",
  pillars: "🏯", elements: "☯️", gods: "🔮",
}

function sectionIcon(heading: string) {
  const lower = heading.toLowerCase()
  for (const [k, v] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(k)) return v
  }
  return "✦"
}

// ── Text enrichment — bold planets become colored badges ──
function enrichLine(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2)
      const lower = inner.toLowerCase()
      for (const [name, color] of Object.entries(PLANET_COLORS)) {
        if (lower.includes(name)) {
          return (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border mx-0.5 align-middle"
              style={{ backgroundColor: color + "18", color, borderColor: color + "40" }}>
              {inner}
            </span>
          )
        }
      }
      return <strong key={i} className="text-zinc-100 font-semibold">{inner}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Section parser ─────────────────────────────────
interface Section {
  title: string
  level: 1 | 2 | 3
  lines: string[]
}

function parseSections(text: string): Section[] {
  const all = text.split("\n")
  const sections: Section[] = []
  let cur: Section | null = null

  for (const line of all) {
    const t = line.trim()
    const h2 = t.match(/^##\s+(.+)/)
    const h3 = t.match(/^###\s+(.+)/)
    const num = t.match(/^(\d+)\.\s+([A-Z][A-Z\s&-]+)$/)
    const caps = t.match(/^([A-Z][A-Z\s&-]{10,})$/)

    if (h2) {
      cur = { title: h2[1].replace(/\*\*/g, "").trim(), level: 1, lines: [] }
      sections.push(cur)
    } else if (h3) {
      cur = { title: h3[1].replace(/\*\*/g, "").trim(), level: 2, lines: [] }
      sections.push(cur)
    } else if (num && t.length < 60) {
      cur = { title: num[0].replace(/\*\*/g, "").trim(), level: 1, lines: [] }
      sections.push(cur)
    } else if (caps && t.length < 60 && !t.startsWith("**")) {
      if (sections.length === 0 || sections[sections.length - 1].lines.length > 0) {
        cur = { title: caps[0], level: 2, lines: [] }
        sections.push(cur)
      }
    } else if (cur) {
      cur.lines.push(line)
    } else {
      cur = { title: "", level: 1, lines: [line] }
      sections.push(cur)
    }
  }

  if (sections.length === 0) sections.push({ title: "", level: 1, lines: all })
  return sections
}

// ── Rendered breakdown ─────────────────────────────
function RichBreakdown({ text }: { text: string }) {
  const sections = parseSections(text)

  return (
    <div className="space-y-4">
      {sections.map((s, si) => {
        const icon = s.title ? sectionIcon(s.title) : null

        return (
          <div key={si} className="relative rounded-2xl border border-amber-500/8 bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden">
            {s.level === 1 && s.title && (
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-400/50 to-transparent" />
            )}
            <div className="p-5" style={s.level === 1 ? { paddingLeft: "1.75rem" } : s.level === 2 ? { paddingLeft: "2.5rem" } : {}}>
              {s.title && (
                <div className="flex items-center gap-2.5 mb-3">
                  {icon && <span className="text-base flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">{icon}</span>}
                  {s.level === 1 ? (
                    <h2 className="text-sm font-bold text-gold-spiritual" style={{ fontFamily: "var(--font-playfair)" }} data-section-id={`s${si}`}>{s.title}</h2>
                  ) : (
                    <h3 className="text-xs font-semibold text-amber-300/70">{s.title}</h3>
                  )}
                </div>
              )}
              <div className="space-y-2">
                {s.lines.map((line, li) => {
                  const t = line.trim()
                  if (!t) return <div key={li} className="h-2" />
                  if (t === "---") return <div key={li} className="my-2 border-t border-amber-500/8" />
                  if (t.startsWith("- ")) {
                    return (
                      <div key={li} className="flex gap-2 pl-1">
                        <span className="text-amber-400/30 mt-1.5 flex-shrink-0 text-xs">•</span>
                        <div className="text-sm text-zinc-300 leading-relaxed">{enrichLine(t.slice(2))}</div>
                      </div>
                    )
                  }
                  return <p key={li} className="text-sm text-zinc-300 leading-relaxed">{enrichLine(t)}</p>
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Planet badge grid ──────────────────────────────
function PlanetGrid({ planets }: { planets: any[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {planets.filter((p: any) => p.name !== "Ascendant").map((p: any) => {
        const color = PLANET_COLORS[p.name?.toLowerCase()] || "#888"
        return (
          <div key={p.name} className="p-3 rounded-xl border border-amber-500/10 bg-white/[0.02] hover:bg-amber-500/[0.04] hover:border-amber-500/20 transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: color + "25", color }}>
                {p.name?.substring(0, 2)}
              </div>
              <span className="text-xs font-semibold text-zinc-300">{p.name}</span>
              {p.isRetro === "true" && <span className="text-[10px] text-amber-400">℞</span>}
            </div>
            <div className="text-[11px] text-zinc-500 space-y-0.5">
              <div className="flex justify-between"><span>Sign</span><span className="text-zinc-300">{p.sign}</span></div>
              <div className="flex justify-between"><span>House</span><span className="text-zinc-300">{p.house}</span></div>
              {p.nakshatra && <div className="flex justify-between"><span>Nakshatra</span><span className="text-zinc-300">{p.nakshatra}</span></div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────
interface Props { chart: Chart }

export function BreakdownDisplay({ chart }: Props) {
  if (!chart.breakdown) {
    return <div className="text-center py-12 text-zinc-500">Breakdown not yet generated.</div>
  }

  // Parse planets
  let planets: any[] = []
  try {
    if (chart.raw_chart) {
      if (Array.isArray(chart.raw_chart)) planets = chart.raw_chart
      else if (chart.raw_chart.planets) planets = chart.raw_chart.planets
    }
  } catch {}

  const isBazi = chart.system === "bazi"
  const hasWheel = planets.length > 0
  const systemLabel = chart.system === "vedic" ? "Vedic Jyotish" : chart.system === "bazi" ? "Bazi · Four Pillars" : "Tropical Western"

  const toast = useToast()
  const handleCopy = () => {
    navigator.clipboard?.writeText(chart.breakdown!)
    toast.show("Reading copied to clipboard")
  }

  return (
    <ErrorBoundary>
    <section className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <ScrollReveal>
      <div className="card-ornate p-5 relative">
        <div className="absolute top-3 right-5 text-6xl text-amber-400/[0.04] font-serif select-none pointer-events-none">ॐ</div>
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] mb-2">
              <span className="text-xs font-serif">ॐ</span>
              <Sparkles className="w-3 h-3" />
              {systemLabel}
            </div>
            <h2 className="text-xl font-bold text-gold-spiritual" style={{ fontFamily: "var(--font-playfair)" }}>
              {chart.person_name}&apos;s Cosmic Blueprint
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {chart.birth_date} · {chart.birth_time} · {chart.birth_city}, {chart.birth_country}
            </p>
          </div>
          <div className="flex items-center gap-1">
<button onClick={handleCopy} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors" title="Copy"><Share2 className="w-4 h-4" /></button>
            <button onClick={() => { const b = new Blob([chart.breakdown!],{type:"text/plain"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = chart.person_name + "-jyotir-reading.txt"; a.click(); URL.revokeObjectURL(u) }} className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors" title="Download"><Download className="w-4 h-4" /></button>
          </div>
        </div>
        {chart.breakdown_model && (
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-zinc-600">Generated by {chart.breakdown_model}</p>
            <ReadingMeta text={chart.breakdown || ""} />
          </div>
        )}
      </div>
      </ScrollReveal>

      {/* ── System Graphic ─────────────────────── */}
      {chart.system === "vedic" && hasWheel && (
        <div className="card-ornate p-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/20" />
            <h3 className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest font-serif">✦ Kundli Mandala ✦</h3>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/20" />
          </div>
          <MandalaChartWheel planets={planets} />
        </div>
      )}

      {chart.system === "tropical" && hasWheel && (
        <div className="card-ornate p-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-indigo-400/20" />
            <h3 className="text-xs font-semibold text-indigo-300/70 uppercase tracking-widest">✦ Aspect Cosmogram ✦</h3>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-indigo-400/20" />
          </div>
          <Cosmogram planets={planets} />
        </div>
      )}

      {chart.system === "bazi" && (
        <div className="card-ornate p-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-red-400/20" />
            <h3 className="text-xs font-semibold text-red-300/70 uppercase tracking-widest font-serif">✦ Five Elements · 五行 ✦</h3>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-red-400/20" />
          </div>
          <BaziPentagon rawChart={chart.raw_chart} />
        </div>
      )}

      {/* ── Planet Grid ────────────────────────── */}
      {hasWheel && chart.system !== "bazi" && (
        <div>
          <div className="section-spiritual mb-3">
            <h3 className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">✦ Planetary Positions ✦</h3>
          </div>
          <PlanetGrid planets={planets} />
        </div>
      )}

      {/* ── Rich Breakdown ─────────────────────── */}
      <div>
        <div className="section-spiritual mb-3">
          <h3 className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">✦ Detailed Reading ✦</h3>
        </div>
        <div data-breakdown-text={chart.breakdown || ""}>
        <RichBreakdown text={chart.breakdown} />
        </div>
      </div>
    </section>
    </ErrorBoundary>
  )
}
