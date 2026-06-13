"use client"

// ── Sanskrit Zodiac Signs ──────────────────────────────
const ZODIAC_SANSKRIT = [
  "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
  "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन",
]

const ZODIAC_ENGLISH = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

const ZODIAC_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"]

// ── Planet Glyphs ──────────────────────────────────────
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Rahu: "☊", Ketu: "☋", Ascendant: "ASC",
}

const PLANET_COLORS: Record<string, string> = {
  Sun: "#fbbf24", Moon: "#c4b5fd", Mercury: "#67e8f9", Venus: "#f9a8d4",
  Mars: "#f87171", Jupiter: "#fde68a", Saturn: "#94a3b8",
  Rahu: "#818cf8", Ketu: "#c084fc", Ascendant: "#fb923c",
}

// ── Sanskrit Numbers ───────────────────────────────────
const SANSKRIT_NUMBERS = ["०","१","२","३","४","५","६","७","८","९"]

function toSanskritNum(n: number): string {
  return String(n).split("").map(d => SANSKRIT_NUMBERS[parseInt(d)]).join("")
}

// ── Main Component ─────────────────────────────────────
interface Props {
  planets: any[]
}

export function MandalaChartWheel({ planets }: Props) {
  const size = 600
  const cx = size / 2
  const cy = size / 2

  // Ring radii
  const outerR = 280       // outer edge with degree ticks
  const zodiacR = 265      // zodiac sign ring
  const houseR = 228       // house number ring
  const innerR = 155       // inner planet ring edge
  const mantraR = 110      // mantra text ring
  const centerR = 55       // center Om

  const toAngle = (deg: number) => ((deg - 90) * Math.PI) / 180

  return (
    <div className="flex justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[600px] h-auto"
        style={{ filter: "drop-shadow(0 0 40px rgba(245,158,11,0.15))" }}
      >
        <defs>
          {/* Glow filters */}
          <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="planetGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          {/* Gold gradient for rings */}
          <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="25%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#fcd34d" />
            <stop offset="75%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Inner gold gradient (lighter) */}
          <linearGradient id="goldLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="50%" stopColor="#fef3c7" />
            <stop offset="100%" stopColor="#fcd34d" />
          </linearGradient>

          {/* Copper gradient */}
          <linearGradient id="copperRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          {/* Center radial glow */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>

          {/* Zodiac segment gradient */}
          <linearGradient id="zodiacGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* ── Outer glow ──────────────────────────── */}
        <circle cx={cx} cy={cy} r={outerR + 15} fill="none" stroke="url(#goldRing)" strokeWidth="0.5" opacity="0.2" filter="url(#softGlow)" />
        <circle cx={cx} cy={cy} r={outerR + 5} fill="none" stroke="url(#goldRing)" strokeWidth="0.3" opacity="0.3" />

        {/* ── Degree tick ring ───────────────────── */}
        {Array.from({ length: 360 }, (_, i) => {
          const angle = toAngle(i)
          const isEvery5 = i % 5 === 0
          const isEvery15 = i % 15 === 0
          const innerTick = isEvery15 ? outerR - 20 : isEvery5 ? outerR - 14 : outerR - 8
          const tickColor = isEvery15 ? "rgba(251,191,36,0.8)" : isEvery5 ? "rgba(251,191,36,0.5)" : "rgba(251,191,36,0.25)"
          const tickWidth = isEvery15 ? 1.2 : isEvery5 ? 0.8 : 0.4

          return (
            <line
              key={`t${i}`}
              x1={cx + outerR * Math.cos(angle)}
              y1={cy + outerR * Math.sin(angle)}
              x2={cx + innerTick * Math.cos(angle)}
              y2={cy + innerTick * Math.sin(angle)}
              stroke={tickColor}
              strokeWidth={tickWidth}
            />
          )
        })}

        {/* 5° labels */}
        {Array.from({ length: 72 }, (_, i) => {
          const deg = i * 5
          const angle = toAngle(deg)
          const lr = outerR - 26
          return (
            <text
              key={`dl${i}`}
              x={cx + lr * Math.cos(angle)}
              y={cy + lr * Math.sin(angle)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(251,191,36,0.55)"
              fontSize={6}
              fontFamily="serif"
              transform={`rotate(${deg + 90}, ${cx + lr * Math.cos(angle)}, ${cy + lr * Math.sin(angle)})`}
            >
              {deg % 15 === 0 ? `${deg}°` : "·"}
            </text>
          )
        })}

        {/* ── Zodiac ring ────────────────────────── */}
        {Array.from({ length: 12 }, (_, i) => {
          const startAngle = toAngle(i * 30)
          const endAngle = toAngle((i + 1) * 30)
          const midAngle = toAngle(i * 30 + 15)
          const x1 = cx + zodiacR * Math.cos(startAngle)
          const y1 = cy + zodiacR * Math.sin(startAngle)
          const x2 = cx + zodiacR * Math.cos(endAngle)
          const y2 = cy + zodiacR * Math.sin(endAngle)
          const mx = cx + (zodiacR - 25) * Math.cos(midAngle)
          const my = cy + (zodiacR - 25) * Math.sin(midAngle)
          const gx = cx + (zodiacR - 42) * Math.cos(midAngle)
          const gy = cy + (zodiacR - 42) * Math.sin(midAngle)

          const pathD = [
            `M ${cx} ${cy}`,
            `L ${x1} ${y1}`,
            `A ${zodiacR} ${zodiacR} 0 0 1 ${x2} ${y2}`,
            "Z"
          ].join(" ")

          return (
            <g key={`zod${i}`}>
              {/* Segment */}
              <path d={pathD} fill="url(#zodiacGrad)" stroke="rgba(251,191,36,0.15)" strokeWidth="0.5" />
              {/* Divider line */}
              <line x1={cx} y1={cy} x2={x1} y2={y1} stroke="rgba(251,191,36,0.12)" strokeWidth="0.4" />

              {/* Sanskrit name */}
              <text
                x={mx}
                y={my}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(251,191,36,0.7)"
                fontSize={9}
                fontFamily="serif"
                fontWeight="bold"
                filter="url(#goldGlow)"
              >
                {ZODIAC_SANSKRIT[i]}
              </text>

              {/* Glyph */}
              <text
                x={gx}
                y={gy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(251,191,36,0.5)"
                fontSize={13}
              >
                {ZODIAC_GLYPHS[i]}
              </text>
            </g>
          )
        })}

        {/* ── Zodiac outer/inner border rings ─────── */}
        <circle cx={cx} cy={cy} r={outerR - 2} fill="none" stroke="url(#goldRing)" strokeWidth="1" opacity="0.5" />
        <circle cx={cx} cy={cy} r={innerR + 22} fill="none" stroke="url(#goldRing)" strokeWidth="0.8" opacity="0.4" />

        {/* ── House ring ──────────────────────────── */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = toAngle(i * 30 + 15)
          const inAng = toAngle(i * 30)
          const nr = houseR
          const hx = cx + nr * Math.cos(angle)
          const hy = cy + nr * Math.sin(angle)
          const lx1 = cx + (innerR + 18) * Math.cos(inAng)
          const ly1 = cy + (innerR + 18) * Math.sin(inAng)

          return (
            <g key={`house${i}`}>
              <line
                x1={cx + (innerR + 22) * Math.cos(inAng)}
                y1={cy + (innerR + 22) * Math.sin(inAng)}
                x2={cx + (zodiacR - 2) * Math.cos(inAng)}
                y2={cy + (zodiacR - 2) * Math.sin(inAng)}
                stroke="rgba(251,191,36,0.1)"
                strokeWidth="0.4"
              />
              <text
                x={hx}
                y={hy}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(251,191,36,0.8)"
                fontSize={7.5}
                fontFamily="serif"
                fontWeight="bold"
                filter="url(#goldGlow)"
              >
                {toSanskritNum(i + 1)}
              </text>
            </g>
          )
        })}

        {/* ── Mantra ring ─────────────────────────── */}
        <circle cx={cx} cy={cy} r={mantraR} fill="none" stroke="url(#copperRing)" strokeWidth="0.5" opacity="0.4" />
        <text>
          <textPath href="#mantraPath" startOffset="0%" fill="rgba(251,191,36,0.35)" fontSize="7" fontFamily="serif" letterSpacing="3">
            ॐ · भूर्भुवः स्वः · तत्सवितुर्वरेण्यं · भर्गो देवस्य धीमहि · धियो यो नः प्रचोदयात् · ॐ
          </textPath>
        </text>
        <path id="mantraPath" d={`M ${cx - mantraR},${cy} A ${mantraR},${mantraR} 0 1,1 ${cx + mantraR - 0.1},${cy} A ${mantraR},${mantraR} 0 1,1 ${cx - mantraR},${cy}`} fill="none" />

        {/* ── Planet orbit ring ───────────────────── */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="url(#goldLight)" strokeWidth="0.6" opacity="0.3" strokeDasharray="4 8" />

        {/* ── Constellation lines between planets ─── */}
        {planets && planets.filter((p: any) => p.name !== "Ascendant").length > 1 && (
          <g opacity="0.25">
            {planets
              .filter((p: any) => p.name !== "Ascendant")
              .sort((a: any, b: any) => (a.fullDegree || 0) - (b.fullDegree || 0))
              .map((p: any, i: number, arr: any[]) => {
                if (i === arr.length - 1) return null
                const a1 = toAngle(p.fullDegree || 0)
                const a2 = toAngle(arr[i + 1].fullDegree || 0)
                // Don't draw line if planets are more than 60° apart
                const diff = Math.abs((p.fullDegree || 0) - (arr[i + 1].fullDegree || 0))
                if (diff > 60 && diff < 300) return null
                return (
                  <line
                    key={`cl${i}`}
                    x1={cx + innerR * Math.cos(a1)}
                    y1={cy + innerR * Math.sin(a1)}
                    x2={cx + innerR * Math.cos(a2)}
                    y2={cy + innerR * Math.sin(a2)}
                    stroke={PLANET_COLORS[p.name] || "#fbbf24"}
                    strokeWidth="0.4"
                    strokeDasharray="2 3"
                  />
                )
              })}
          </g>
        )}

        {/* ── Planets ─────────────────────────────── */}
        {planets && planets.map((p: any) => {
          const deg = p.fullDegree || 0
          const angle = toAngle(deg)
          const r = (p.name === "Ascendant" ? innerR + 16 : innerR)
          const px = cx + r * Math.cos(angle)
          const py = cy + r * Math.sin(angle)
          const color = PLANET_COLORS[p.name] || "#fbbf24"
          const glyph = PLANET_GLYPHS[p.name] || p.name?.substring(0, 2)

          return (
            <g key={p.name}>
              <title>{p.name} in {p.sign} · House {p.house || "?"} · {Math.floor(p.fullDegree || 0)}°{p.nakshatra ? " · " + p.nakshatra : ""}{p.isRetro === "true" ? " · Retrograde" : ""}</title>
              {/* Planet glow */}
              <circle cx={px} cy={py} r={12} fill={color} opacity="0.12" filter="url(#softGlow)" />
              {/* Planet ring */}
              <circle cx={px} cy={py} r={8} fill="rgba(10,10,26,0.9)" stroke={color} strokeWidth="1.5" filter="url(#planetGlow)" />
              {/* Inner dot */}
              <circle cx={px} cy={py} r={2.5} fill={color} opacity="0.9" />
              {/* Glyph label */}
              <text
                x={px}
                y={py - 14}
                textAnchor="middle"
                fill={color}
                fontSize={10}
                fontWeight="bold"
                filter="url(#goldGlow)"
              >
                {glyph}
              </text>
              {/* Degree label */}
              <text
                x={px}
                y={py + 20}
                textAnchor="middle"
                fill="rgba(251,191,36,0.6)"
                fontSize={7}
                fontFamily="serif"
              >
                {Math.floor(deg)}°
              </text>
            </g>
          )
        })}

        {/* ── Center — Om ─────────────────────────── */}
        <circle cx={cx} cy={cy} r={centerR + 5} fill="rgba(10,10,26,0.95)" stroke="url(#goldRing)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={centerR - 5} fill="none" stroke="url(#goldLight)" strokeWidth="0.4" opacity="0.4" />
        {/* Center glow */}
        <circle cx={cx} cy={cy} r={centerR + 10} fill="url(#centerGlow)" />

        {/* Om symbol */}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          dominantBaseline="central"
          fill="url(#goldLight)"
          fontSize={32}
          fontFamily="serif"
          fontWeight="bold"
          filter="url(#goldGlow)"
          style={{ fontStyle: "italic" }}
        >
          ॐ
        </text>
      </svg>
    </div>
  )
}
