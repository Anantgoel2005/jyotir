"use client"

import { useEffect, useRef, useMemo } from "react"

// Section detection
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
  tokenCount: number; maxTokens: number
  streamingText: string; streamDone: boolean; system: string
}

const ZODIAC = ["\u2648","\u2649","\u264a","\u264b","\u264c","\u264d","\u264e","\u264f","\u2650","\u2651","\u2652","\u2653"]

export function CosmicProgress({ tokenCount, maxTokens, streamingText, streamDone, system }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentSection = detectSection(streamingText)
  const pct = Math.min(Math.round((tokenCount / maxTokens) * 100), 99)
  const displayPct = streamDone ? 100 : Math.max(pct, 1)

  const theme = useMemo(() => ({
    vedic:   { hue: 38,  ring: "rgba(245,158,11,0.15)", glow: "245,158,11", center: "\u0950", label: "Kundli \u0936\u093e\u0928\u094d\u0924\u093f", stars: ["rgba(251,191,36,","rgba(245,158,11,","rgba(252,211,77,"] },
    tropical:{ hue: 240, ring: "rgba(99,102,241,0.15)", glow: "99,102,241",  center: "\u2609", label: "Cosmic Geometry",    stars: ["rgba(99,102,241,","rgba(34,211,238,","rgba(167,139,250,"] },
    bazi:    { hue: 0,   ring: "rgba(239,68,68,0.15)", glow: "239,68,68",   center: "\u4e94\u884c", label: "Element Balance", stars: ["rgba(239,68,68,","rgba(248,113,113,","rgba(252,165,165,"] },
  }[system] || { hue: 38, ring: "rgba(245,158,11,0.15)", glow: "245,158,11", center: "\u0950", label: "", stars: ["rgba(251,191,36,"] }), [system])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let anim: number; let lastTime = 0; let elapsed = 0
    const stars: { x: number; y: number; r: number; phase: number; speed: number; alpha: number }[] = []
    for (let i = 0; i < 80; i++) {
      stars.push({ x: Math.random(), y: Math.random(), r: 0.3 + Math.random() * 1.8, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 1.5, alpha: 0.3 + Math.random() * 0.7 })
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
      if (lastTime === 0) lastTime = ms
      const dt = Math.min(ms - lastTime, 50)
      lastTime = ms
      elapsed += dt
      const t = elapsed * 0.001
      const w = canvas.width / 2; const h = 250; const cx = w / 2; const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      // Deep space bg
      const bg = ctx.createRadialGradient(cx, cy, 5, cx, cy, w * 0.7)
      bg.addColorStop(0, "rgba(15,10,30,0.6)"); bg.addColorStop(0.5, "rgba(5,5,15,0.2)"); bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      // Twinkling stars
      stars.forEach(s => {
        s.phase += s.speed * (dt * 0.06)
        const alpha = s.alpha * (0.5 + Math.sin(s.phase) * 0.5)
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fillStyle = theme.stars[Math.floor(s.phase) % 3] + alpha + ")"
        ctx.fill()
      })

      // ── System-specific visuals ──────────────────
      if (system === "vedic") {
        // Mandala rings
        for (let r = 90; r <= 110; r += 10) {
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(245,158,11,${0.06 + Math.sin(t + r) * 0.03})`
          ctx.lineWidth = 0.5; ctx.setLineDash(r === 100 ? [3, 7] : [1, 6]); ctx.stroke(); ctx.setLineDash([])
        }
        // Orbiting nodes at 12 positions
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 + t * 0.03
          const px = cx + 100 * Math.cos(a); const py = cy + 100 * Math.sin(a)
          ctx.fillStyle = `rgba(245,158,11,${0.3 + Math.sin(t * 1.5 + i) * 0.2})`
          ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill()
        }
        // Center Om
        ctx.fillStyle = streamDone ? "rgba(245,158,11,0.7)" : "rgba(220,200,180,0.4)"
        ctx.font = "bold 28px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText("\u0950", cx, cy + 2)
      } else if (system === "tropical") {
        // Geometric grid lines
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
          ctx.beginPath(); ctx.moveTo(cx, cy)
          ctx.lineTo(cx + 100 * Math.cos(a), cy + 100 * Math.sin(a))
          ctx.strokeStyle = "rgba(99,102,241,0.06)"; ctx.lineWidth = 0.4; ctx.stroke()
        }
        // Orbiting nodes
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + t * 0.5 * (1 + i * 0.1)
          const or = 60 + i * 8
          const px = cx + or * Math.cos(a); const py = cy + or * Math.sin(a)
          ctx.fillStyle = `hsla(240,80%,70%,${0.4 + Math.sin(t + i) * 0.2})`
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
        }
        // Zodiac ring
        ctx.beginPath(); ctx.arc(cx, cy, 105, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(99,102,241,0.1)"; ctx.lineWidth = 0.8; ctx.setLineDash([3, 10]); ctx.stroke(); ctx.setLineDash([])
        ZODIAC.forEach((z, i) => {
          const a = (i / 12) * Math.PI * 2 + t * 0.02
          ctx.fillStyle = "rgba(99,102,241,0.25)"
          ctx.font = "11px serif"; ctx.textAlign = "center"
          ctx.fillText(z, cx + 105 * Math.cos(a), cy + 105 * Math.sin(a) + 4)
        })
        // Center Sun
        ctx.fillStyle = streamDone ? "rgba(245,158,11,0.6)" : "rgba(200,210,240,0.4)"
        ctx.font = "bold 20px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText("\u2609", cx, cy + 2)
      } else {
        // Bazi — pentagram
        const pentaR = 85
        for (let i = 0; i < 5; i++) {
          const a1 = ((i * 72 - 90) * Math.PI) / 180
          const a2 = (((i + 2) * 72 - 90) * Math.PI) / 180
          ctx.beginPath()
          ctx.moveTo(cx + pentaR * Math.cos(a1), cy + pentaR * Math.sin(a1))
          ctx.lineTo(cx + pentaR * 0.5 * Math.cos(a2), cy + pentaR * 0.5 * Math.sin(a2))
          ctx.strokeStyle = "rgba(239,68,68,0.12)"; ctx.lineWidth = 0.6; ctx.stroke()
        }
        // Pentagon border
        ctx.beginPath()
        for (let i = 0; i < 5; i++) {
          const a = ((i * 72 - 90) * Math.PI) / 180
          i === 0 ? ctx.moveTo(cx + pentaR * Math.cos(a), cy + pentaR * Math.sin(a)) : ctx.lineTo(cx + pentaR * Math.cos(a), cy + pentaR * Math.sin(a))
        }
        ctx.closePath(); ctx.strokeStyle = "rgba(239,68,68,0.15)"; ctx.lineWidth = 1; ctx.stroke()
        // Element nodes
        const elChars = ["\u6728","\u706b","\u571f","\u91d1","\u6c34"]
        const elColors = ["#4ade80","#ef4444","#f59e0b","#e2e8f0","#3b82f6"]
        for (let i = 0; i < 5; i++) {
          const a = ((i * 72 - 90) * Math.PI) / 180 + t * 0.02
          const px = cx + pentaR * Math.cos(a); const py = cy + pentaR * Math.sin(a)
          ctx.fillStyle = elColors[i]
          ctx.font = "bold 14px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
          ctx.fillText(elChars[i], px, py)
        }
        // Center
        ctx.fillStyle = streamDone ? "#fbbf24" : "rgba(220,200,200,0.45)"
        ctx.font = "bold 18px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText("\u4e94\u884c", cx, cy + 2)
      }

      // Center glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45)
      const pulse = 0.05 + Math.sin(t * 0.6) * 0.02
      cg.addColorStop(0, `rgba(${theme.glow},${pulse})`); cg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 45, 0, Math.PI * 2); ctx.fill()

      // Floating dust
      for (let i = 0; i < 15; i++) {
        const dx = cx + Math.sin(t * 0.7 + i * 0.9) * 110
        const dy = cy + Math.cos(t * 1.0 + i * 1.2) * 65
        ctx.beginPath(); ctx.arc(dx, dy, 0.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.sin(t + i) * 0.02})`
        ctx.fill()
      }

      if (!streamDone) anim = requestAnimationFrame(draw)
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone])

  return (
    <div className="w-full space-y-4">
      <div className="relative">
        <canvas ref={canvasRef} className="w-full" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase mt-20">{streamDone ? "\u2726 Constellation Revealed \u2726" : "\u2726 " + theme.label + " \u2726"}</p>
        </div>
      </div>
      <div className="flex justify-center gap-2 px-4">
        {SECTIONS.map((s, i) => {
          const done = i < currentSection || streamDone
          const cur = i === currentSection && !streamDone
          return (
            <div key={s.key} className="flex flex-col items-center gap-1 flex-1 max-w-[60px]">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${
                done ? "bg-gradient-to-br from-amber-500/30 to-amber-600/30 border border-amber-400/40" :
                cur ? "bg-white/5 border-2 border-amber-400 animate-pulse" :
                "bg-white/[0.02] border border-white/[0.06]"
              }`}>{done ? "\u2713" : cur ? <span className="animate-spin text-[10px]">\u25cc</span> : s.icon}</div>
              <span className={`text-[8px] text-center leading-tight ${done ? "text-zinc-400" : cur ? "text-amber-400" : "text-zinc-700"}`}>{s.label}</span>
            </div>
          )
        })}
      </div>
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
            <span className="tabular-nums">{tokenCount}/{maxTokens}</span>
            {currentSection >= 0 && !streamDone && <span className="text-amber-400/70">{SECTIONS[currentSection].icon} {SECTIONS[currentSection].label}</span>}
          </div>
          <span className="text-zinc-700">{streamDone ? "Complete" : tokenCount === 0 ? "Preparing..." : "Generating..."}</span>
        </div>
      </div>
    </div>
  )
}
