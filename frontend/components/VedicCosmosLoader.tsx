"use client"

import { useEffect, useRef } from "react"

interface Props { streamDone: boolean }

export function VedicCosmosLoader({ streamDone }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    let anim: number; let t = 0
    const particles: { x: number; y: number; vx: number; vy: number; life: number; ml: number; s: number; h: number; a: number }[] = []
    const yantras: { r: number; rot: number; speed: number; lw: number; alpha: number }[] = []

    for (let i = 0; i < 6; i++) {
      yantras.push({ r: 40 + i * 22, rot: Math.random() * Math.PI * 2, speed: 0.0003 + Math.random() * 0.0005, lw: 0.4 + i * 0.15, alpha: 0.15 - i * 0.02 })
    }

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      const w = p.clientWidth
      canvas.width = w * 2; canvas.height = 800
      canvas.style.width = w + "px"; canvas.style.height = "400px"
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = (ms: number) => {
      t = ms
      const w = canvas.width / 2; const h = 400; const cx = w / 2; const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      // Deep cosmic bg
      const bg = ctx.createRadialGradient(cx, cy, 30, cx, cy, w * 0.9)
      bg.addColorStop(0, "rgba(40,20,10,0.6)"); bg.addColorStop(0.5, "rgba(10,8,16,0.3)"); bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      // Savitr mantra ring (outermost)
      ctx.save(); ctx.translate(cx, cy)
      ctx.beginPath(); ctx.arc(0, 0, 170, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(245,158,11,0.06)"; ctx.lineWidth = 0.5; ctx.setLineDash([2, 14]); ctx.stroke(); ctx.setLineDash([])
      ctx.restore()

      // Spinning yantra rings
      yantras.forEach(y => {
        y.rot += y.speed * (streamDone ? 0.3 : 1)
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(y.rot)
        
        // Petal patterns (6 or 8 petals)
        const petals = y.r < 80 ? 6 : y.r < 130 ? 8 : 12
        for (let i = 0; i < petals; i++) {
          const a = (i / petals) * Math.PI * 2
          const px = Math.cos(a) * y.r * 0.6
          const py = Math.sin(a) * y.r * 0.6
          ctx.beginPath()
          ctx.ellipse(px, py, y.r * 0.35, y.r * 0.15, a, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(245,158,11,${y.alpha})`
          ctx.fill()
        }
        
        // Ring
        ctx.beginPath(); ctx.arc(0, 0, y.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(245,158,11,${y.alpha + 0.08})`; ctx.lineWidth = y.lw; ctx.stroke()
        ctx.restore()
      })

      // Spawn sacred particles (Om-shaped bursts)
      if (!streamDone && particles.length < 80) {
        const a = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 1.2
        particles.push({
          x: 0, y: 0, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          life: 0, ml: 60 + Math.random() * 120,
          s: 1 + Math.random() * 3,
          h: 30 + Math.random() * 25,
          a: a,
        })
      }

      ctx.save(); ctx.translate(cx, cy)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.life++
        const fade = 1 - p.life / p.ml
        if (p.life >= p.ml) { particles.splice(i, 1); continue }
        
        // Spiral motion
        const spiral = p.a + p.life * 0.03
        const sr = p.s * 2 + p.life * 0.5
        const sx = p.x + Math.cos(spiral) * sr; const sy = p.y + Math.sin(spiral) * sr
        
        ctx.beginPath(); ctx.arc(sx, sy, p.s * fade, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.h},90%,65%,${fade * 0.7})`
        ctx.fill()
      }
      ctx.restore()

      // Fixed star map (nakshatra-like)
      const stars = [
        [0.2,0.15],[0.55,0.1],[0.8,0.2],[0.35,0.25],[0.65,0.3],[0.15,0.4],[0.45,0.35],[0.75,0.45],[0.9,0.35],
        [0.25,0.55],[0.55,0.5],[0.85,0.55],[0.1,0.7],[0.4,0.65],[0.7,0.7],[0.5,0.8],[0.85,0.78],[0.2,0.85]
      ]
      stars.forEach(([sx, sy], i) => {
        const px = sx * w; const py = sy * h
        const twinkle = 0.3 + Math.sin(t * 0.002 + i * 1.7) * 0.5
        const c = ["#fbbf24","#fcd34d","#f59e0b","#d97706"][i % 4]
        // Star cross (nakshatra style)
        ctx.save(); ctx.translate(px, py)
        const r = (1 + twinkle) * 1.5
        ctx.strokeStyle = c; ctx.globalAlpha = twinkle * 0.6; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(-r * 2, 0); ctx.lineTo(r * 2, 0); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, -r * 2); ctx.lineTo(0, r * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-r, r); ctx.lineTo(r, -r); ctx.stroke()
        // Center glow
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2)
        g.addColorStop(0, c); g.addColorStop(1, "transparent")
        ctx.fillStyle = g; ctx.globalAlpha = twinkle * 0.4
        ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      })

      // Center Om
      ctx.save(); ctx.translate(cx, cy)
      const pulse = 1 + Math.sin(t * 0.002) * 0.1
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * pulse)
      cg.addColorStop(0, streamDone ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.12)")
      cg.addColorStop(0.5, "rgba(245,158,11,0.03)"); cg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 50 * pulse, 0, Math.PI * 2); ctx.fill()

      // Om symbol
      ctx.fillStyle = `rgba(245,158,11,${0.5 + Math.sin(t * 0.002) * 0.2})`
      ctx.font = `bold ${42 * pulse}px serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("ॐ", 0, 1)
      ctx.restore()

      // Status ring (outer)
      ctx.beginPath(); ctx.arc(cx, cy, 178, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(245,158,11,0.1)"; ctx.lineWidth = 1; ctx.setLineDash([1, 8]); ctx.stroke(); ctx.setLineDash([])

      // Petal glow dots on outer ring
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.0003
        const px = cx + 178 * Math.cos(a); const py = cy + 178 * Math.sin(a)
        ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(245,158,11,${0.3 + Math.sin(t * 0.004 + i) * 0.2})`
        ctx.fill()
      }

      if (!streamDone) {
        anim = requestAnimationFrame(draw)
      } else {
        requestAnimationFrame(draw) // One more frame for static render
      }
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone])

  return <canvas ref={ref} className="w-full" />
}
