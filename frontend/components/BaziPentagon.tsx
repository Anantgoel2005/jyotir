"use client"

interface Props {
  rawChart: Record<string, any>
}

const FIVE_ELEMENTS = [
  { name: "Wood 木", color: "#4ade80", angle: -90 },
  { name: "Fire 火", color: "#ef4444", angle: -18 },
  { name: "Earth 土", color: "#f59e0b", angle: 54 },
  { name: "Metal 金", color: "#e2e8f0", angle: 126 },
  { name: "Water 水", color: "#3b82f6", angle: 198 },
]

const STEM_ELEMENTS: Record<string, string> = {
  Jia: "Wood", Yi: "Wood", Bing: "Fire", Ding: "Fire", Wu: "Earth",
  Ji: "Earth", Geng: "Metal", Xin: "Metal", Ren: "Water", Gui: "Water",
}

const BRANCH_ELEMENTS: Record<string, string> = {
  Zi: "Water", Chou: "Earth", Yin: "Wood", Mao: "Wood", Chen: "Earth", Si: "Fire",
  Wu: "Fire", Wei: "Earth", Shen: "Metal", You: "Metal", Xu: "Earth", Hai: "Water",
}

const ELEMENT_COLORS: Record<string, string> = {
  Wood: "#4ade80", Fire: "#ef4444", Earth: "#f59e0b", Metal: "#e2e8f0", Water: "#3b82f6",
}

const ELEMENT_CHARS: Record<string, string> = {
  Wood: "木", Fire: "火", Earth: "土", Metal: "金", Water: "水",
}

export function BaziPentagon({ rawChart }: Props) {
  const size = 640
  const cx = 240
  const cy = 280
  const pentaR = 160
  const pillarX = 480
  const pillarStartY = 80
  const pillarW = 130
  const pillarH = 68
  const pillarGap = 10

  const toAngle = (deg: number) => ((deg - 90) * Math.PI) / 180

  const yearPillar = (rawChart?.year_pillar || "").split(" ")
  const monthPillar = (rawChart?.month_pillar || "").split(" ")
  const dayPillar = (rawChart?.day_pillar || "").split(" ")
  const hourPillar = (rawChart?.hour_pillar || "").split(" ")
  const dayMaster = rawChart?.day_master_element || ""
  const dayMasterStem = rawChart?.day_master_stem || ""

  const pillars = [
    { label: "Year", cn: "年", stem: yearPillar[0] || "—", branch: yearPillar[1] || "—", isDay: false },
    { label: "Month", cn: "月", stem: monthPillar[0] || "—", branch: monthPillar[1] || "—", isDay: false },
    { label: "Day", cn: "日", stem: dayPillar[0] || "—", branch: dayPillar[1] || "—", isDay: true },
    { label: "Hour", cn: "时", stem: hourPillar[0] || "—", branch: hourPillar[1] || "—", isDay: false },
  ]

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[640px] h-auto">
        <defs>
          <filter id="fireGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={size} height={size} fill="url(#bgGlow)" />

        {/* Pentagon lines */}
        {FIVE_ELEMENTS.map((el, i) => {
          const next = FIVE_ELEMENTS[(i + 1) % 5]
          return (
            <line key={`p${i}`}
              x1={cx + pentaR * Math.cos(toAngle(el.angle))} y1={cy + pentaR * Math.sin(toAngle(el.angle))}
              x2={cx + pentaR * Math.cos(toAngle(next.angle))} y2={cy + pentaR * Math.sin(toAngle(next.angle))}
              stroke={el.color} strokeWidth="1.2" opacity="0.5" />
          )
        })}

        {/* Star lines (destructive cycle) */}
        {FIVE_ELEMENTS.map((el, i) => {
          const next = FIVE_ELEMENTS[(i + 2) % 5]
          return (
            <line key={`s${i}`}
              x1={cx + pentaR * 0.55 * Math.cos(toAngle(el.angle))} y1={cy + pentaR * 0.55 * Math.sin(toAngle(el.angle))}
              x2={cx + pentaR * 0.55 * Math.cos(toAngle(next.angle))} y2={cy + pentaR * 0.55 * Math.sin(toAngle(next.angle))}
              stroke="rgba(239,68,68,0.25)" strokeWidth="0.8" strokeDasharray="4 4" />
          )
        })}

        {/* Element nodes */}
        {FIVE_ELEMENTS.map((el) => {
          const angle = toAngle(el.angle)
          const ex = cx + pentaR * Math.cos(angle)
          const ey = cy + pentaR * Math.sin(angle)
          return (
            <g key={el.name}>
              {/* Outer glow */}
              <circle cx={ex} cy={ey} r={27} fill={el.color} opacity="0.08" />
              {/* Node */}
              <circle cx={ex} cy={ey} r={22} fill="rgba(16,8,12,0.95)" stroke={el.color} strokeWidth="2" filter="url(#fireGlow)" />
              {/* Character */}
              <text x={ex} y={ey + 1} textAnchor="middle" dominantBaseline="central"
                fill={el.color} fontSize={22} fontWeight="bold" fontFamily="serif" filter="url(#fireGlow)">
                {ELEMENT_CHARS[el.name.split(" ")[0]] || "?"}
              </text>
              {/* Name below */}
              <text x={ex} y={ey + 34} textAnchor="middle" fill={el.color} fontSize={9} opacity="0.7">
                {el.name}
              </text>
            </g>
          )
        })}

        {/* Center Day Master */}
        <circle cx={cx} cy={cy} r={48} fill="rgba(16,8,12,0.97)" stroke="#ef4444" strokeWidth="2.5" filter="url(#fireGlow)" />
        <circle cx={cx} cy={cy} r={40} fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="0.5" />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#fbbf24" fontSize={11} fontWeight="bold">
          Day Master
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={ELEMENT_COLORS[dayMaster] || "#fbbf24"} fontSize={22} fontWeight="bold" fontFamily="serif">
          {dayMasterStem || "—"}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill={ELEMENT_COLORS[dayMaster] || "#fbbf24"} fontSize={9} opacity="0.7">
          {dayMaster || ""}
        </text>

        {/* Pillars sidebar header */}
        <text x={pillarX} y={pillarStartY - 18} fill="#fbbf24" fontSize={13} fontWeight="bold" textAnchor="middle" fontFamily="serif">
          四柱 · Four Pillars
        </text>
        {/* Header underline */}
        <line x1={pillarX - 50} y1={pillarStartY - 6} x2={pillarX + 50} y2={pillarStartY - 6}
          stroke="rgba(239,68,68,0.3)" strokeWidth="0.5" />

        {/* Column labels */}
        <text x={pillarX - 30} y={pillarStartY + 10} fill="#666" fontSize={9} textAnchor="middle">Stem</text>
        <text x={pillarX + 30} y={pillarStartY + 10} fill="#666" fontSize={9} textAnchor="middle">Branch</text>

        {pillars.map((p, i) => {
          const y = pillarStartY + 24 + i * (pillarH + pillarGap)
          const stemEl = STEM_ELEMENTS[p.stem] || ""
          const branchEl = BRANCH_ELEMENTS[p.branch] || ""
          const sc = ELEMENT_COLORS[stemEl] || "#ccc"
          const bc = ELEMENT_COLORS[branchEl] || "#ccc"

          return (
            <g key={p.label}>
              {/* Pillar card */}
              <rect x={pillarX - pillarW / 2} y={y} width={pillarW} height={pillarH} rx={8}
                fill={p.isDay ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.02)"}
                stroke={p.isDay ? "#ef4444" : "rgba(255,255,255,0.06)"}
                strokeWidth={p.isDay ? 1.5 : 0.8} />

              {/* Pillar label */}
              <text x={pillarX - pillarW / 2 + 10} y={y + pillarH / 2} fill={p.isDay ? "#fbbf24" : "#777"}
                fontSize={10} fontWeight={p.isDay ? "bold" : "normal"} dominantBaseline="central">
                {p.cn}
              </text>

              {/* Stem character */}
              <text x={pillarX - 30} y={y + pillarH / 2 - 6} fill={sc} fontSize={20} fontWeight="bold"
                fontFamily="serif" textAnchor="middle" filter="url(#fireGlow)">
                {p.stem}
              </text>
              {/* Stem element name */}
              <text x={pillarX - 30} y={y + pillarH / 2 + 12} fill={sc} fontSize={8} opacity="0.6"
                textAnchor="middle">
                {stemEl || "—"}
              </text>

              {/* Separator line */}
              <line x1={pillarX} y1={y + 10} x2={pillarX} y2={y + pillarH - 10}
                stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />

              {/* Branch character */}
              <text x={pillarX + 30} y={y + pillarH / 2 - 6} fill={bc} fontSize={20} fontWeight="bold"
                fontFamily="serif" textAnchor="middle" filter="url(#fireGlow)">
                {p.branch}
              </text>
              {/* Branch element name */}
              <text x={pillarX + 30} y={y + pillarH / 2 + 12} fill={bc} fontSize={8} opacity="0.6"
                textAnchor="middle">
                {branchEl || "—"}
              </text>
            </g>
          )
        })}

        {/* Legend */}
        <g transform={`translate(${cx - 60}, ${cy + pentaR + 60})`}>
          <line x1={0} y1={0} x2={20} y2={0} stroke="#ef4444" strokeWidth="1.2" opacity="0.5" />
          <text x={25} y={3} fill="#666" fontSize={8}>Productive 生</text>
          <line x1={100} y1={0} x2={120} y2={0} stroke="rgba(239,68,68,0.25)" strokeWidth="0.8" strokeDasharray="4 4" />
          <text x={125} y={3} fill="#666" fontSize={8}>Destructive 克</text>
        </g>
      </svg>
    </div>
  )
}
