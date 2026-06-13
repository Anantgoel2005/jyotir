"use client"

import { useEffect, useRef } from "react"

// Section detection patterns
const SECTIONS = [
  { key: "overview", label: "Overview", icon: "\ud83c\udf0c" },
  { key: "planets", label: "Planetary Deep Dive", icon: "\ud83e\ude90" },
  { key: "houses", label: "The Houses", icon: "\ud83c\udfdb\ufe0f" },
  { key: "aspects", label: "Aspect Analysis", icon: "\u2728" },
  { key: "trajectory", label: "Life Trajectory", icon: "\ud83c\udf05" },
  { key: "embodiment", label: "Embodiment Advice", icon: "\ud83c\udf3f" },
]

const SECTION_PATTERNS = [
  /(?:^|\n)(?:#+\s*)?1\.?\s*OVERVIEW/i,
  /(?:^|\n)(?:#+\s*)?2\.?\s*(?:PLANETARY|PLANETS|GRAHA)/i,
  /(?:^|\n)(?:#+\s*)?3\.?\s*(?:THE\s*HOUSES|HOUSES|BHAVA)/i,
  /(?:^|\n)(?:#+\s*)?4\.?\s*(?:ASPECT|NAKSHATRA)/i,
  /(?:^|\n)(?:#+\s*)?5\.?\s*(?:LIFE|TRAJECTORY|DASHA|TIMING|KARMIC)/i,
  /(?:^|\n)(?:#+\s*)?6\.?\s*(?:EMBODIMENT|REMEDIES|UPAYA|GUIDANCE)/i,
]

function detectSection(text: string): number {
  let idx = -1
  for (let i = 0; i < SECTION_PATTERNS.length; i++) {
    if (SECTION_PATTERNS[i].test(text)) idx = i
  }
  return idx
}

interface Props {
  tokenCount: number
  maxTokens: number
  streamingText: string
  streamDone: boolean
  system: string
}

export function CosmicProgress({ tokenCount, maxTokens, streamingText, streamDone, system }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentSection = detectSection(streamingText)
  const pct = Math.min(Math.round((tokenCount / maxTokens) * 100), 99)
  const displayPct = streamDone ? 100 : Math.max(pct, 1)

  const theme = system === "vedic"
    ? { hue: 40, ring: "rgba(245,158,11,0.12)", glow: "245,158,11", label: "Kundli Shanti" }
    : system === "tropical"
    ? { hue: 240, ring: "rgba(99,102,241,0.12)", glow: "99,102,241", label: "Cosmic Geometry" }
    : { hue: 0, ring: "rgba(239,68,68,0.12)", glow: "239,68,68", label: "Element Balance" }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let anim: number; let t = 0
    const stars: { x: number; y: number; r: number; phase: number; speed: number; alpha: number }[] = []
    for (let i = 0; i < 100; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        r: 0.3 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.02,
        alpha: 0.3 + Math.random() * 0.7,
      })
    }

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      canvas.width = p.clientWidth * 2
      canvas.height = 500
      canvas.style.width = p.clientWidth + "px"
      canvas.style.height = "250px"
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = (ms: number) => {
      t = ms
      const w = canvas.width / 2; const h = 250; const cx = w / 2; const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      // Deep space bg
      const bg = ctx.createRadialGradient(cx, cy, 5, cx, cy, w * 0.7)
      bg.addColorStop(0, "rgba(15,10,30,0.7)")
      bg.addColorStop(0.5, "rgba(5,5,15,0.3)")
      bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      // Twinkling stars
      stars.forEach(s => {
        s.phase += s.speed
        const alpha = s.alpha * (0.5 + Math.sin(s.phase) * 0.5)
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fill()
      })

      // Zodiac ring
      const zR = 100
      ctx.beginPath(); ctx.arc(cx, cy, zR, 0, Math.PI * 2)
      ctx.strokeStyle = theme.ring; ctx.lineWidth = 0.8; ctx.setLineDash([3, 10]); ctx.stroke(); ctx.setLineDash([])

      // Orbiting planets
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * (0.0002 + i * 0.0001)
        const or = zR + 15 + i * 5
        const px = cx + or * Math.cos(a); const py = cy + or * Math.sin(a)
        const hue = (theme.hue + i * 30) % 360
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${hue},70%,65%,0.7)`
        ctx.fill()
      }

      // Center glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50)
      const pulse = 0.06 + Math.sin(t * 0.003) * 0.03
      cg.addColorStop(0, `rgba(${theme.glow},${pulse})`)
      cg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = cg
      ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill()

      // Center Om
      ctx.fillStyle = streamDone ? `rgba(${theme.glow},0.7)` : "rgba(200,200,220,0.4)"
      ctx.font = "bold 24px serif"
      ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("ॐ", cx, cy + 2)

      // Floating particles
      for (let i = 0; i < 20; i++) {
        const dx = cx + Math.sin(t * 0.0004 + i * 0.8) * 120
        const dy = cy + Math.cos(t * 0.0006 + i * 1.1) * 70
        ctx.beginPath(); ctx.arc(dx, dy, 0.7, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.06 + Math.sin(t * 0.002 + i) * 0.03})`
        ctx.fill()
      }

      if (!streamDone) anim = requestAnimationFrame(draw)
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone, theme])

  return (
    <div className="w-full space-y-4">
      {/* Canvas animation */}
      <div className="relative">
        <canvas ref={canvasRef} className="w-full" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase mt-20">
            {streamDone ? "✦ Constellation Revealed ✦" : "✦ " + (system === "vedic" ? "Weaving the Kundli" : system === "tropical" ? "Mapping the Aspects" : "Balancing the Elements") + " ✦"}
          </p>
        </div>
      </div>

      {/* Section trail dots */}
      <div className="flex justify-center gap-2 px-4">
        {SECTIONS.map((s, i) => {
          const done = i < currentSection || streamDone
          const current = i === currentSection && !streamDone
          return (
            <div key={s.key} className="flex flex-col items-center gap-1 flex-1 max-w-[60px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${
                done ? "bg-gradient-to-br from-amber-500/30 to-amber-600/30 border border-amber-400/40" :
                current ? "bg-white/5 border-2 border-amber-400 animate-pulse" :
                "bg-white/[0.02] border border-white/[0.06]"
              }`}>
                {done ? "✓" : current ? <span className="animate-spin text-[10px]">◌</span> : s.icon}
              </div>
              <span className={`text-[8px] text-center leading-tight transition-colors ${
                done ? "text-zinc-400" : current ? "text-amber-400" : "text-zinc-700"
              }`}>{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="relative w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${displayPct}%`, background: `linear-gradient(90deg, hsl(${theme.hue},80%,50%), hsl(${(theme.hue+30)%360},80%,60%))` }}>
            <div className="absolute inset-0 rounded-full bg-white/20 animate-shimmer-fast" />
          </div>
        </div>
        <div className="flex justify-between text-[10px]">
          <div className="flex items-center gap-3 text-zinc-500">
            <span className="tabular-nums font-mono text-zinc-300">{displayPct}%</span>
            <span className="tabular-nums">{tokenCount}/{maxTokens} tokens</span>
            {currentSection >= 0 && !streamDone && (
              <span className="text-amber-400/70">{SECTIONS[currentSection].icon} {SECTIONS[currentSection].label}</span>
            )}
          </div>
          <span className="text-zinc-700">
            {streamDone ? "Complete" : tokenCount === 0 ? "Preparing..." : "Generating..."}
          </span>
        </div>
      </div>
    </div>
  )
}
