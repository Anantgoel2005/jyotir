"use client"

import { useEffect, useRef } from "react"

interface Props { streamDone: boolean }

export function TropicalAspectsLoader({ streamDone }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return
    let anim: number; let t = 0
    const nodes: { a: number; r: number; speed: number; s: number; color: string }[] = []
    const lines: { n1: number; n2: number; phase: number }[] = []
    const particles: { x: number; y: number; vx: number; vy: number; life: number; ml: number; s: number; h: number }[] = []

    for (let i = 0; i < 12; i++) {
      nodes.push({ a: (i / 12) * Math.PI * 2, r: 50 + i * 12, speed: 0.0002 + Math.random() * 0.0004, s: 2 + Math.random() * 2, color: ["#6366f1","#22d3ee","#818cf8","#c4b5fd"][i % 4] })
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (Math.random() < 0.35) lines.push({ n1: i, n2: j, phase: Math.random() * Math.PI * 2 })
      }
    }

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      canvas.width = p.clientWidth * 2; canvas.height = 800
      canvas.style.width = p.clientWidth + "px"; canvas.style.height = "400px"
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = (ms: number) => {
      t = ms
      const w = canvas.width / 2; const h = 400; const cx = w / 2; const cy = h / 2
      ctx.clearRect(0, 0, w, h)

      const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.9)
      bg.addColorStop(0, "rgba(15,15,40,0.5)"); bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      // Geometric grid
      ctx.strokeStyle = "rgba(99,102,241,0.03)"; ctx.lineWidth = 0.3
      for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
      for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }

      ctx.save(); ctx.translate(cx, cy)
      nodes.forEach(n => { n.a += n.speed })

      // Aspect lines
      lines.forEach(l => {
        const n1 = nodes[l.n1]; const n2 = nodes[l.n2]
        const p1r = n1.r + Math.sin(t * 0.001 + l.phase) * 8
        const p2r = n2.r + Math.cos(t * 0.001 + l.phase) * 8
        const x1 = Math.cos(n1.a) * p1r; const y1 = Math.sin(n1.a) * p1r
        const x2 = Math.cos(n2.a) * p2r; const y2 = Math.sin(n2.a) * p2r

        const alpha = 0.1 + Math.sin(t * 0.002 + l.phase) * 0.06
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2)
        ctx.strokeStyle = `rgba(99,102,241,${alpha})`; ctx.lineWidth = 0.4
        ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([])
      })

      // Nodes
      nodes.forEach(n => {
        const px = Math.cos(n.a) * n.r; const py = Math.sin(n.a) * n.r
        const g = ctx.createRadialGradient(px, py, 0, px, py, n.s * 2)
        g.addColorStop(0, n.color); g.addColorStop(1, "transparent")
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, n.s * 2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(px, py, n.s * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = n.color; ctx.fill()
      })
      ctx.restore()

      // Particles
      if (!streamDone && particles.length < 50) {
        const a = Math.random() * Math.PI * 2
        particles.push({
          x: cx, y: cy, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5,
          life: 0, ml: 80 + Math.random() * 100, s: 1 + Math.random() * 2, h: 230 + Math.random() * 30
        })
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life++
        if (p.life >= p.ml) { particles.splice(i, 1); continue }
        const fade = 1 - p.life / p.ml
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * fade, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.h},80%,70%,${fade * 0.6})`; ctx.fill()
      }

      // Center ☉
      const pulse = 1 + Math.sin(t * 0.002) * 0.08
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 * pulse)
      cg.addColorStop(0, "rgba(99,102,241,0.2)"); cg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, 40 * pulse, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "rgba(220,220,255,0.6)"; ctx.font = "28px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.fillText("☉", cx, cy + 1)

      if (!streamDone) anim = requestAnimationFrame(draw)
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone])

  return <canvas ref={ref} className="w-full" />
}
