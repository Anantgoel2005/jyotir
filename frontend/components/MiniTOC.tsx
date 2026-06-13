"use client"

import { useState, useEffect } from "react"

function extractSections(text: string): { id: string; title: string; level: number }[] {
  const lines = text.split("\n")
  const sections: { id: string; title: string; level: number }[] = []
  let counter = 0
  for (const line of lines) {
    const h2 = line.trim().match(/^##\s+(.+)/)
    if (h2) {
      sections.push({ id: `s${counter++}`, title: h2[1].replace(/\*\*/g, "").trim().slice(0, 35), level: 1 })
    }
  }
  return sections
}

export function MiniTOC() {
  const [text, setText] = useState("")
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.querySelector("[data-breakdown-text]")
    if (el) setText(el.getAttribute("data-breakdown-text") || "")
  }, [])

  const sections = extractSections(text)

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 500)
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [])

  useEffect(() => {
    if (!visible || sections.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = sections.findIndex(s => s.id === entry.target.id)
            if (idx >= 0) setActive(idx)
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    )
    const headings = document.querySelectorAll("[data-section-id]")
    headings.forEach(h => observer.observe(h))
    return () => observer.disconnect()
  }, [visible, sections])

  if (sections.length < 3 || !visible) return null

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30 hidden xl:flex flex-col items-end gap-1">
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => {
            const el = document.querySelector(`[data-section-id="${s.id}"]`)
            el?.scrollIntoView({ behavior: "smooth", block: "start" })
          }}
          className="group flex items-center gap-2 py-1"
          title={s.title}
        >
          <span className={`text-[10px] text-right leading-tight max-w-[160px] truncate transition-all duration-300 ${
            i === active ? "text-amber-300 translate-x-0 opacity-100" : "text-zinc-700 translate-x-2 opacity-0 group-hover:opacity-70 group-hover:translate-x-0 group-hover:text-zinc-500"
          }`}>
            {s.title}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-300 ${
            i === active ? "bg-amber-400 scale-125 shadow-sm shadow-amber-400/30" : "bg-zinc-700 group-hover:bg-zinc-500"
          }`} />
        </button>
      ))}
    </div>
  )
}
