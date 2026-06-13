"use client"

import { useState, useEffect } from "react"

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const check = () => setVisible(window.scrollY > 600)
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-amber-500/10 border border-amber-400/20 backdrop-blur-md flex items-center justify-center text-amber-400 hover:bg-amber-500/20 hover:border-amber-400/40 transition-all duration-300 shadow-lg shadow-amber-500/5 group"
      aria-label="Back to top"
    >
      <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  )
}
