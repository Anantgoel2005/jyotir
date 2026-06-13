"use client"

import { useState, type ReactNode } from "react"

interface Props {
  content: ReactNode
  children: ReactNode
}

export function ChartTooltip({ content, children }: Props) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  return (
    <g
      onMouseEnter={(e) => {
        setShow(true)
        setPos({ x: e.clientX, y: e.clientY })
      }}
      onMouseMove={(e) => {
        setPos({ x: e.clientX, y: e.clientY })
      }}
      onMouseLeave={() => setShow(false)}
      style={{ cursor: "pointer" }}
    >
      {children}
      {show && (
        <foreignObject
          x={pos.x}
          y={pos.y}
          width="1"
          height="1"
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div className="fixed z-50 px-3 py-2 rounded-lg bg-zinc-900/95 border border-amber-400/30 backdrop-blur-md text-xs text-zinc-200 shadow-xl shadow-amber-500/5 whitespace-nowrap pointer-events-none"
            style={{ left: pos.x + 12, top: pos.y - 10, transform: "translateY(-100%)" }}>
            {content}
          </div>
        </foreignObject>
      )}
    </g>
  )
}
