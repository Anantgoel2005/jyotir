"use client"

const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "⊙", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "ASC",
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#f59e0b", Moon: "#a78bfa", Mercury: "#22d3ee", Venus: "#f472b6",
  Mars: "#ef4444", Jupiter: "#4ade80", Saturn: "#94a3b8",
  Uranus: "#2dd4bf", Neptune: "#818cf8", Pluto: "#a855f7",
}

const ELEMENTS: Record<number, { name: string; color: string }> = {
  0: { name: "Fire", color: "#ef4444" },
  1: { name: "Earth", color: "#84cc16" },
  2: { name: "Air", color: "#facc15" },
  3: { name: "Water", color: "#3b82f6" },
}

interface Props {
  planets: any[]
}

export function Cosmogram({ planets }: Props) {
  const size = 560
  const cx = size / 2
  const cy = size / 2
  const outerR = 260
  const zodiacR = 240
  const aspectR = 170
  const innerR = 100
  const centerR = 45

  const toAngle = (deg: number) => ((deg - 90) * Math.PI) / 180

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[560px] h-auto">
        <defs>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="softNeon">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r={outerR + 8} fill="none" stroke="#6366f1" strokeWidth="0.5" opacity="0.2" filter="url(#softNeon)" />

        {/* Degree ticks */}
        {Array.from({ length: 72 }, (_, i) => {
          const deg = i * 5
          const angle = toAngle(deg)
          const inner = deg % 15 === 0 ? outerR - 18 : outerR - 8
          return (
            <line
              key={`t${i}`}
              x1={cx + outerR * Math.cos(angle)} y1={cy + outerR * Math.sin(angle)}
              x2={cx + inner * Math.cos(angle)} y2={cy + inner * Math.sin(angle)}
              stroke={deg % 15 === 0 ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.2)"}
              strokeWidth={deg % 15 === 0 ? 1 : 0.4}
            />
          )
        })}

        {/* Outer ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="url(#ringGrad)" strokeWidth="1.2" opacity="0.6" />

        {/* Zodiac ring — geometric segments */}
        {Array.from({ length: 12 }, (_, i) => {
          const midAngle = toAngle(i * 30 + 15)
          const gx = cx + (zodiacR - 15) * Math.cos(midAngle)
          const gy = cy + (zodiacR - 15) * Math.sin(midAngle)

          return (
            <g key={`zod${i}`}>
              {/* Segment arc */}
              <path
                d={[
                  `M ${cx + zodiacR * Math.cos(toAngle(i * 30))} ${cy + zodiacR * Math.sin(toAngle(i * 30))}`,
                  `A ${zodiacR} ${zodiacR} 0 0 1 ${cx + zodiacR * Math.cos(toAngle((i + 1) * 30))} ${cy + zodiacR * Math.sin(toAngle((i + 1) * 30))}`,
                ].join(" ")}
                fill="none"
                stroke={i % 3 === 0 ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.1)"}
                strokeWidth={i % 3 === 0 ? 1.5 : 0.6}
              />
              {/* Glyph */}
              <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central"
                fill={i % 3 === 0 ? "rgba(34,211,238,0.8)" : "rgba(99,102,241,0.5)"}
                fontSize={i % 3 === 0 ? 15 : 12} filter="url(#neonGlow)">
                {ZODIAC_GLYPHS[i]}
              </text>
            </g>
          )
        })}

        {/* Zodiac boundary */}
        <circle cx={cx} cy={cy} r={zodiacR + 5} fill="none" stroke="rgba(99,102,241,0.3)" strokeWidth="0.5" />

        {/* Element triangles */}
        {[0, 3, 6, 9].map(start => {
          const pts = [start, start + 4, start + 8].map(i => {
            const a = toAngle(i * 30 + 15)
            return `${cx + (zodiacR - 35) * Math.cos(a)},${cy + (zodiacR - 35) * Math.sin(a)}`
          })
          return (
            <polygon key={`tri${start}`} points={pts.join(" ")}
              fill={ELEMENTS[start / 3].color} opacity="0.06"
              stroke={ELEMENTS[start / 3].color} strokeWidth="0.4" strokeOpacity="0.3" />
          )
        })}

        {/* Aspect ring */}
        <circle cx={cx} cy={cy} r={aspectR} fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="0.6" strokeDasharray="3 6" />

        {/* Aspect lines between planets */}
        {planets && planets.filter((p: any) => p.name !== "Ascendant").length > 1 && (
          <g opacity="0.4">
            {planets
              .filter((p: any) => p.name !== "Ascendant")
              .flatMap((p1: any, i: number) =>
                planets.filter((p2: any) => p2.name !== "Ascendant").slice(i + 1).map((p2: any) => {
                  const diff = Math.abs((p1.fullDegree || 0) - (p2.fullDegree || 0))
                  // Only draw major aspects: conjunction (0°), sextile (60°), square (90°),
                  // trine (120°), opposition (180°)
                  const aspects = [
                    { angle: 0, orb: 8, color: "#f59e0b", dash: "" },
                    { angle: 60, orb: 6, color: "#4ade80", dash: "3 3" },
                    { angle: 90, orb: 6, color: "#ef4444", dash: "" },
                    { angle: 120, orb: 6, color: "#22d3ee", dash: "4 4" },
                    { angle: 180, orb: 8, color: "#a855f7", dash: "" },
                  ]
                  const match = aspects.find(a => Math.abs(diff - a.angle) <= a.orb || Math.abs(diff - (360 - a.angle)) <= a.orb)
                  if (!match) return null

                  const a1 = toAngle(p1.fullDegree || 0)
                  const a2 = toAngle(p2.fullDegree || 0)
                  // Draw line inside aspect ring
                  const r = aspectR - 20
                  return (
                    <line key={`asp${i}-${p2.name}`}
                      x1={cx + r * Math.cos(a1)} y1={cy + r * Math.sin(a1)}
                      x2={cx + r * Math.cos(a2)} y2={cy + r * Math.sin(a2)}
                      stroke={match.color} strokeWidth="0.8" opacity="0.6"
                      strokeDasharray={match.dash} />
                  )
                })
              )}
          </g>
        )}

        {/* Planets */}
        {planets && planets.map((p: any) => {
          const deg = p.fullDegree || 0
          const angle = toAngle(deg)
          const r = p.name === "Ascendant" ? innerR + 18 : innerR
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          const color = PLANET_COLORS[p.name] || "#6366f1"
          const glyph = PLANET_GLYPHS[p.name] || p.name?.substring(0, 2)

          return (
            <g key={p.name}>
              <circle cx={px} cy={py} r={10} fill={color} opacity="0.1" filter="url(#softNeon)" />
              <circle cx={px} cy={py} r={7} fill="rgba(10,10,30,0.9)" stroke={color} strokeWidth="1.5" filter="url(#neonGlow)" />
              <circle cx={px} cy={py} r={2.5} fill={color} opacity="0.9" />
              <text x={px} y={py - 13} textAnchor="middle" fill={color} fontSize={9} fontWeight="bold" filter="url(#neonGlow)">
                {glyph}
              </text>
            </g>
          )
        })}

        {/* Center — Sun-Moon-Ascendant triad */}
        <circle cx={cx} cy={cy} r={centerR + 3} fill="rgba(10,10,30,0.95)" stroke="url(#innerGrad)" strokeWidth="1.2" />
        <circle cx={cx} cy={cy} r={centerR + 8} fill="url(#centerGlow)" />
        {/* Triple circle */}
        {[centerR - 12, centerR - 6, centerR].map((r, i) => (
          <circle key={`cc${i}`} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="0.4" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="url(#innerGrad)" fontSize={15} fontWeight="bold" filter="url(#neonGlow)">
          ☉ ☽ ASC
        </text>
      </svg>
    </div>
  )
}
