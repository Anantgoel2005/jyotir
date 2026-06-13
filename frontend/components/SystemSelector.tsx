"use client"
import { Sparkles, Sun, Moon, Compass } from "lucide-react"
import { useLang } from "@/lib/lang"

interface Props {
  onSelect: (system: "tropical" | "vedic" | "bazi") => void
}

const SYSTEMS = [
  {
    id: "tropical" as const,
    icon: Sun,
    color: "from-amber-500 to-orange-600",
    bgGlow: "bg-amber-500/10",
    mantra: "☉",
  },
  {
    id: "vedic" as const,
    icon: Moon,
    color: "from-indigo-500 to-purple-600",
    bgGlow: "bg-indigo-500/10",
    mantra: "☽",
  },
  {
    id: "bazi" as const,
    icon: Compass,
    color: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/10",
    mantra: "☯",
  },
]

export function SystemSelector({ onSelect }: Props) {
  const { t } = useLang()

  return (
    <div className="max-w-3xl mx-auto pt-16 pb-12">
      {/* Hero with Om accent */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-amber-400/5 border border-amber-400/15 text-amber-300/80 text-xs mb-8 animate-float">
          <span className="text-sm" style={{ fontFamily: "serif" }}>ॐ</span>
          <span className="w-px h-3 bg-amber-400/20" />
          <Sparkles className="w-3 h-3" />
          <span>{t("tagline")}</span>
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-gold-spiritual"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {t("subtitle")}
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto leading-relaxed">
          {t("description")}
        </p>
        {/* Decorative Om */}
        <div className="mt-6 text-amber-400/10 text-5xl" style={{ fontFamily: "serif" }}>ॐ</div>
      </div>

      {/* Cards with spiritual borders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SYSTEMS.map((sys) => (
          <button
            key={sys.id}
            onClick={() => onSelect(sys.id)}
            className="group relative p-6 rounded-2xl border border-amber-500/10 bg-gradient-to-br from-white/[0.02] to-white/[0.01] hover:from-amber-500/[0.04] hover:to-purple-500/[0.04] hover:border-amber-500/25 transition-all duration-500 text-left overflow-hidden"
          >
            {/* Glow on hover */}
            <div
              className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${sys.bgGlow} blur-2xl`}
            />

            {/* Sacred geometry border shimmer */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/0 via-amber-400/8 to-amber-400/0 animate-shimmer" />
            </div>

            <div className="relative z-10 space-y-4">
              {/* Mantra symbol watermark */}
              <div className="absolute top-2 right-3 text-5xl opacity-[0.04] group-hover:opacity-[0.08] transition-opacity font-serif select-none">
                {sys.mantra}
              </div>

              {/* Icon with gold ring */}
              <div className="relative inline-flex">
                <div className="absolute inset-0 rounded-xl bg-amber-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${sys.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg`}
                >
                  <sys.icon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-semibold group-hover:text-amber-200 transition-colors">
                  {t(sys.id)}
                </h3>
                <p className="text-xs text-zinc-500 uppercase tracking-wider group-hover:text-amber-400/60 transition-colors">
                  {t(sys.id + "Sub")}
                </p>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                {t(sys.id + "Desc")}
              </p>

              {/* CTA */}
              <div className="pt-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                <span className="text-sm font-medium text-gold-spiritual">
                  {t("select")}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
