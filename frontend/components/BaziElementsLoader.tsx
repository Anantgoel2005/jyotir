"use client"

import { useEffect, useRef } from "react"

interface Props { streamDone: boolean }

export function BaziElementsLoader({ streamDone }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return
    let anim: number; let t = 0
    const particles: { x: number; y: number; vx: number; vy: number; life: number; ml: number; s: number; color: string }[] = []
    const elements = [
      { char: "木", color: "#4ade80", a: -90, r: 140 },
      { char: "火", color: "#ef4444", a: -18, r: 140 },
      { char: "土", color: "#f59e0b", a: 54, r: 140 },
      { char: "金", color: "#e2e8f0", a: 126, r: 140 },
      { char: "水", color: "#3b82f6", a: 198, r: 140 },
    ]

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      canvas.width = p.clientWidth * 2; canvas.height = 800
      canvas.style.width = p.clientWidth + "px"; canvas.style.height = "400px"
      ctx.setTransform(2, 0, 0, 2, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const cx = () => canvas.width / 4
    const cy = 200

    const draw = (ms: number) => {
      t = ms
      const w = canvas.width / 2; const h = 400; const cxx = w / 2; const cyy = h / 2
      ctx.clearRect(0, 0, w, h)

      const bg = ctx.createRadialGradient(cxx, cyy, 20, cxx, cyy, w * 0.8)
      bg.addColorStop(0, "rgba(25,8,8,0.6)"); bg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

      // Pentagon ring
      ctx.save(); ctx.translate(cxx, cyy)
      const rr = 145
      elements.forEach((el, i) => {
        const next = elements[(i + 1) % 5]
        const a1 = (el.a - 90) * Math.PI / 180; const a2 = (next.a - 90) * Math.PI / 180
        ctx.beginPath(); ctx.moveTo(Math.cos(a1) * rr, Math.sin(a1) * rr)
        ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr)
        ctx.strokeStyle = el.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5; ctx.stroke()
      })

      // Star lines
      elements.forEach((el, i) => {
        const next = elements[(i + 2) % 5]
        const a1 = (el.a - 90) * Math.PI / 180; const a2 = (next.a - 90) * Math.PI / 180
        ctx.beginPath(); ctx.moveTo(Math.cos(a1) * rr * 0.55, Math.sin(a1) * rr * 0.55)
        ctx.lineTo(Math.cos(a2) * rr * 0.55, Math.sin(a2) * rr * 0.55)
        ctx.strokeStyle = "rgba(239,68,68,0.3)"; ctx.lineWidth = 0.8
        ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([])
      })

      // Element nodes
      elements.forEach(el => {
        const a = (el.a - 90) * Math.PI / 180 + t * 0.00005
        const px = Math.cos(a) * rr; const py = Math.sin(a) * rr
        // Glow
        const g = ctx.createRadialGradient(px, py, 0, px, py, 20)
        g.addColorStop(0, el.color); g.addColorStop(1, "transparent")
        ctx.fillStyle = g; ctx.globalAlpha = 0.15; ctx.beginPath(); ctx.arc(px, py, 20, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
        // Node
        ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(20,8,8,0.95)"; ctx.fill()
        ctx.strokeStyle = el.color; ctx.lineWidth = 2; ctx.stroke()
        ctx.fillStyle = el.color; ctx.font = "bold 20px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
        ctx.fillText(el.char, px, py + 1)
      })

      // Center 五行
      const pulse = 1 + Math.sin(t * 0.002) * 0.06
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 45 * pulse)
      cg.addColorStop(0, "rgba(239,68,68,0.2)"); cg.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(20,8,8,0.95)"; ctx.fill()
      ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2.5; ctx.stroke()
      ctx.fillStyle = "#fbbf24"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.fillText("Day Master", 0, -8)
      ctx.font = "bold 26px serif"; ctx.fillText("五", -12, 6); ctx.fillText("行", 12, 6)
      ctx.restore()

      // Particles
      if (!streamDone && particles.length < 40) {
        const el = elements[Math.floor(Math.random() * 5)]
        const a = (el.a - 90) * Math.PI / 180
        const sx = cxx + Math.cos(a) * rr; const sy = cyy + Math.sin(a) * rr
        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 0.6
        particles.push({
          x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0, ml: 60 + Math.random() * 90, s: 1 + Math.random() * 2.5, color: el.color
        })
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life++
        if (p.life >= p.ml) { particles.splice(i, 1); continue }
        const fade = 1 - p.life / p.ml
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * fade, 0, Math.PI * 2)
        ctx.fillStyle = p.color.replace(")", `,${fade * 0.6})`).replace("rgb", "rgba")
        if (p.color.startsWith("#")) {
          const r = parseInt(p.color.slice(1,3), 16)
          const g = parseInt(p.color.slice(3,5), 16)
          const b = parseInt(p.color.slice(5,7), 16)
          ctx.fillStyle = `rgba(${r},${g},${b},${fade * 0.6})`
        }
        ctx.fill()
      }

      // Floating characters
      for (let i = 0; i < 5; i++) {
        const ch = ["木","火","土","金","水"][i]
        const fc = ["#4ade80","#ef4444","#f59e0b","#e2e8f0","#3b82f6"][i]
        const fx = cxx + Math.sin(t * 0.0008 + i * 2) * 160
        const fy = cyy + Math.cos(t * 0.001 + i * 2) * 100
        ctx.globalAlpha = 0.06 + Math.sin(t * 0.002 + i) * 0.03
        ctx.fillStyle = fc; ctx.font = "bold 40px serif"; ctx.textAlign = "center"
        ctx.fillText(ch, fx, fy + 12)
      }
      ctx.globalAlpha = 1

      if (!streamDone) anim = requestAnimationFrame(draw)
    }

    anim = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(anim); window.removeEventListener("resize", resize) }
  }, [streamDone])

  return <canvas ref={ref} className="w-full" />
}
