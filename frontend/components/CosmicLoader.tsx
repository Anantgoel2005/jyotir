"use client"

import { useEffect, useRef } from "react"

const ZODIAC = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"]

interface Theme {
  ringColor: string
  particleHue: number
  centerSymbol: string
  centerFont: string
  zodiacColor: string
  starColors: string[]
  label: string
  doneLabel: string
}

const THEMES: Record<string, Theme> = {
  vedic: {
    ringColor: "rgba(245,158,11,0.15)",
    particleHue: 35,
    centerSymbol: "ॐ",
    centerFont: "bold 36px serif",
    zodiacColor: "rgba(245,158,11,0.4)",
    starColors: ["rgba(245,158,11,", "rgba(251,191,36,", "rgba(252,211,77,", "rgba(253,224,71,"],
    label: "✦ Aligning the Stars · Kundli Shanti ✦",
    doneLabel: "✦ Kundli Revealed ✦",
  },
  tropical: {
    ringColor: "rgba(99,102,241,0.15)",
    particleHue: 240,
    centerSymbol: "☉",
    centerFont: "bold 32px sans-serif",
    zodiacColor: "rgba(99,102,241,0.5)",
    starColors: ["rgba(99,102,241,", "rgba(34,211,238,", "rgba(129,140,248,", "rgba(167,139,250,"],
    label: "✦ Mapping Aspects · Cosmic Geometry ✦",
    doneLabel: "✦ Cosmogram Complete ✦",
  },
  bazi: {
    ringColor: "rgba(239,68,68,0.15)",
    particleHue: 0,
    centerSymbol: "五行",
    centerFont: "bold 22px serif",
    zodiacColor: "rgba(239,68,68,0.4)",
    starColors: ["rgba(239,68,68,", "rgba(248,113,113,", "rgba(252,165,165,", "rgba(254,202,202,"],
    label: "✦ Balancing Elements · 五行调合 ✦",
    doneLabel: "✦ Elements Aligned ✦",
  },
}

interface Props {
  streamDone: boolean
  system: string
}

export function CosmicLoader({ streamDone, system }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const theme = THEMES[system] || THEMES.vedic

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let anim: number
    let t = 0
    const particles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; hue: number }[] = []

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      const w = p.clientWidth
      canvas.width = w * 2
      canvas.height = 700
      canvas.style.width = w + "px"
      canvas.style.height = "350px"
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    // Random star positions
    const stars = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 2.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.004,
    }))

    const draw = (ms: number) => {
      t = ms
      const w = canvas.width / 2, h = 350, cx = w / 2, cy = h / 2
      ctx.clearRect(0, 0, w, h)

      // Background
      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.8)
      bg.addColorStop(0, "rgba(20,15,40,0.5)")
      bg.addColorStop(0.5, "rgba(8,8,20,0.2)")
      bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Zodiac ring
      const zR = 135
      ctx.beginPath(); ctx.arc(cx, cy, zR, 0, Math.PI * 2)
      ctx.strokeStyle = theme.ringColor; ctx.lineWidth = 1; ctx.setLineDash([2, 8]); ctx.stroke(); ctx.setLineDash([])

      // Zodiac symbols
      ZODIAC.forEach((sym, i) => {
        const a = (i / 12) * Math.PI * 2 + t * 0.00008
        const sx = cx + zR * Math.cos(a), sy = cy + zR * Math.sin(a)
        const alpha = 0.25 + Math.sin(t * 0.002 + i) * 0.15
        ctx.fillStyle = theme.zodiacColor.replace("0.4", String(alpha)).replace("0.5", String(alpha + 0.1))
        ctx.font = "13px serif"; ctx.textAlign = "center"
        ctx.fillText(sym, sx, sy + 5)
      })

      // Outer orbit
      const oR = 158
      ctx.beginPath(); ctx.arc(cx, cy, oR, 0, Math.PI * 2)
      ctx.strokeStyle = theme.ringColor.replace("0.15", "0.06"); ctx.lineWidth = 0.5
      ctx.setLineDash([1, 12]); ctx.stroke(); ctx.setLineDash([])

      // Inner orbit
      const iR = 98
      ctx.beginPath(); ctx.arc(cx, cy, iR, 0, Math.PI * 2)
      ctx.strokeStyle = theme.ringColor.replace("0.15", "0.08"); ctx.lineWidth = 0.4
      ctx.setLineDash([3, 7]); ctx.stroke(); ctx.setLineDash([])

      // Stars
      stars.forEach((s, i) => {
        const sx = s.x * w, sy = s.y * h
        const twinkle = 0.3 + Math.sin(t * s.speed + s.phase) * 0.5
        const sc = theme.starColors[i % theme.starColors.length]
        // Glow
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.r * 3)
        g.addColorStop(0, sc + String(twinkle * 0.6) + ")")
        g.addColorStop(1, "rgba(0,0,0,0)")
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 3, 0, Math.PI * 2); ctx.fill()
        // Core
        ctx.fillStyle = sc + String(twinkle) + ")"
        ctx.beginPath(); ctx.arc(sx, sy, s.r * 0.5, 0, Math.PI * 2); ctx.fill()
      })

      // Constellation lines between nearby stars
      for (let i = 0; i < stars.length - 1; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = (stars[i].x - stars[j].x) * w
          const dy = (stars[i].y - stars[j].y) * h
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120 && Math.random() > 0.85) {
            const alpha = (1 - dist / 120) * 0.08
            ctx.beginPath()
            ctx.moveTo(stars[i].x * w, stars[i].y * h)
            ctx.lineTo(stars[j].x * w, stars[j].y * h)
            ctx.strokeStyle = theme.ringColor.replace("0.15", String(alpha))
            ctx.lineWidth = 0.3; ctx.stroke()
          }
        }
      }

      // Particles from center
      if (!streamDone && particles.length < 50) {
        const angle = Math.random() * Math.PI * 2
        const speed = 0.4 + Math.random() * 0.9
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0, maxLife: 70 + Math.random() * 100,
          size: 1 + Math.random() * 2.5,
          hue: theme.particleHue + Math.random() * 20 - 10,
        })
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.life++
        const fade = 1 - p.life / p.maxLife
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},80%,65%,${fade * 0.5})`
        ctx.fill()
      }

      // Center glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55)
      const pulse = 0.08 + Math.sin(t * 0.003) * 0.04
      const glowColor = system === "vedic" ? "245,158,11" : system === "tropical" ? "99,102,241" : "239,68,68"
      if (streamDone) {
        cg.addColorStop(0, `rgba(${glowColor},0.25)`)
        cg.addColorStop(1, "rgba(0,0,0,0)")
      } else {
        cg.addColorStop(0, `rgba(${glowColor},${pulse})`)
        cg.addColorStop(1, "rgba(0,0,0,0)")
      }
      ctx.fillStyle = cg
      ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.fill()

      // Center symbol
      const alpha = streamDone ? 0.75 : 0.45 + Math.sin(t * 0.002) * 0.1
      ctx.fillStyle = streamDone
        ? `rgba(${glowColor},${alpha})`
        : `rgba(220,220,240,${alpha})`
      ctx.font = theme.centerFont
      ctx.textAlign = "center"; ctx.textBaseline = "middle"

      if (system === "bazi") {
        // Draw five small element dots around center for Bazi
        ctx.fillText("五", cx - 14, cy + 2)
        ctx.fillText("行", cx + 14, cy + 2)
        // Element dots
        const elColors = ["#4ade80","#ef4444","#f59e0b","#e2e8f0","#3b82f6"]
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2
          const r = 16
          ctx.beginPath(); ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 2.5, 0, Math.PI * 2)
          ctx.fillStyle = elColors[i]; ctx.fill()
        }
      } else {
        ctx.fillText(theme.centerSymbol, cx, cy + 2)
      }

      if (!streamDone) {
        anim = requestAnimationFrame(draw)
      } else {
        setTimeout(() => {
          ctx.clearRect(0, 0, w, h)
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
          ctx.beginPath(); ctx.arc(cx, cy, zR, 0, Math.PI * 2)
          ctx.strokeStyle = theme.ringColor.replace("0.15", "0.25"); ctx.lineWidth = 1; ctx.stroke()
          ZODIAC.forEach((sym, i) => {
            const a = (i / 12) * Math.PI * 2
            ctx.fillStyle = theme.zodiacColor.replace("0.4", "0.6").replace("0.5", "0.6")
            ctx.font = "13px serif"; ctx.textAlign = "center"
            ctx.fillText(sym, cx + zR * Math.cos(a), cy + zR * Math.sin(a) + 5)
          })
          stars.forEach((s, i) => {
            ctx.fillStyle = theme.starColors[i % theme.starColors.length] + "0.5)"
            ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r * 0.6, 0, Math.PI * 2); ctx.fill()
          })
          const cg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55)
          cg2.addColorStop(0, `rgba(${glowColor},0.25)`); cg2.addColorStop(1, "rgba(0,0,0,0)")
          ctx.fillStyle = cg2; ctx.beginPath(); ctx.arc(cx, cy, 55, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = `rgba(${glowColor},0.8)`; ctx.font = theme.centerFont; ctx.textAlign = "center"; ctx.textBaseline = "middle"
          if (system === "bazi") {
            ctx.fillText("五", cx - 14, cy + 2); ctx.fillText("行", cx + 14, cy + 2)
            const elColors = ["#4ade80","#ef4444","#f59e0b","#e2e8f0","#3b82f6"]
            for (let i = 0; i < 5; i++) {
              const a = (i / 5) * Math.PI * 2 - Math.PI / 2
              ctx.beginPath(); ctx.arc(cx + 16 * Math.cos(a), cy + 16 * Math.sin(a), 2.5, 0, Math.PI * 2)
              ctx.fillStyle = elColors[i]; ctx.fill()
            }
          } else {
            ctx.fillText(theme.centerSymbol, cx, cy + 2)
          }
        }, 100)
      }
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone, system])

  return (
    <div className="relative w-full select-none">
      <canvas ref={ref} className="w-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase mt-64">
          {streamDone ? theme.doneLabel : theme.label}
        </p>
      </div>
    </div>
  )
}
