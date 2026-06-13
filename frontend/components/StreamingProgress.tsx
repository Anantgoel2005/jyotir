"use client"

import { Sparkles, Star, CheckCircle2, Loader2 } from "lucide-react"

// Breakdown sections that the LLM generates (matches the system prompt)
const SECTIONS = [
  { key: "overview", label: "Overview", icon: "\ud83c\udf0c" },
  { key: "planets", label: "Planetary Deep Dive", icon: "\ud83e\ude90" },
  { key: "houses", label: "The Houses", icon: "\ud83c\udfdb\ufe0f" },
  { key: "aspects", label: "Aspect Analysis", icon: "\u2728" },
  { key: "trajectory", label: "Life Trajectory", icon: "\ud83c\udf05" },
  { key: "embodiment", label: "Embodiment Advice", icon: "\ud83c\udf3f" },
]

// Section detection patterns (ordered — first match wins)
const SECTION_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: "overview", pattern: /(?:^|\n)(?:#+\s*)?1\.?\s*OVERVIEW/i },
  { key: "planets", pattern: /(?:^|\n)(?:#+\s*)?2\.?\s*(?:PLANETARY\s*DEEP\s*DIVE|PLANETS)/i },
  { key: "houses", pattern: /(?:^|\n)(?:#+\s*)?3\.?\s*(?:THE\s*HOUSES|HOUSES)/i },
  { key: "aspects", pattern: /(?:^|\n)(?:#+\s*)?4\.?\s*(?:ASPECT\s*ANALYSIS|ASPECTS)/i },
  { key: "trajectory", pattern: /(?:^|\n)(?:#+\s*)?5\.?\s*(?:LIFE\s*TRAJECTORY|TRAJECTORY)/i },
  { key: "embodiment", pattern: /(?:^|\n)(?:#+\s*)?6\.?\s*(?:EMBODIMENT\s*ADVICE|EMBODIMENT)/i },
]

export function detectCurrentSection(text: string): number {
  // Returns the index of the current section (0-5) or -1 if none detected yet
  let currentIndex = -1
  for (const { pattern } of SECTION_PATTERNS) {
    if (pattern.test(text)) {
      currentIndex = SECTION_PATTERNS.findIndex(p => p.pattern === pattern)
    }
  }
  return currentIndex
}

interface Props {
  tokenCount: number
  maxTokens: number
  streamingText: string
  streamDone: boolean
}

export function StreamingProgress({ tokenCount, maxTokens, streamingText, streamDone }: Props) {
  const currentSectionIndex = detectCurrentSection(streamingText)
  const percent = Math.min(Math.round((tokenCount / maxTokens) * 100), 99)
  const displayPercent = streamDone ? 100 : Math.max(percent, 1)

  return (
    <div className="w-full space-y-5">
      {/* Section trail */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-[calc(8.33%+6px)] right-[calc(8.33%+6px)] h-[1px]">
          <div className="h-full bg-white/5" />
          <div
            className="h-full bg-gradient-to-r from-brand-400 via-gold-400 to-brand-400 -mt-[1px] transition-all duration-700 ease-out"
            style={{ width: `${streamDone ? 100 : (currentSectionIndex + 1) / SECTIONS.length * 100}%` }}
          />
        </div>

        {/* Section dots */}
        <div className="flex justify-between relative z-10">
          {SECTIONS.map((section, i) => {
            const isComplete = i < currentSectionIndex || streamDone
            const isCurrent = i === currentSectionIndex && !streamDone && tokenCount > 0
            const isPending = i > currentSectionIndex && !streamDone

            return (
              <div
                key={section.key}
                className="flex flex-col items-center gap-2"
                style={{ width: `${100 / SECTIONS.length}%` }}
              >
                {/* Dot */}
                <div className="relative">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm
                      transition-all duration-500
                      ${isComplete
                        ? "bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25"
                        : isCurrent
                          ? "bg-white/10 border-2 border-brand-400 shadow-lg shadow-brand-400/20 animate-pulse"
                          : "bg-white/5 border border-white/10"
                      }
                    `}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />
                    ) : (
                      <span className="text-[10px] text-zinc-600">{i + 1}</span>
                    )}
                  </div>

                  {/* Glow ring for current */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-brand-400/20 blur-md animate-pulse -z-10" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-[10px] leading-tight text-center transition-all duration-300
                    ${isComplete ? "text-zinc-400" : isCurrent ? "text-brand-300 font-medium" : "text-zinc-700"}
                  `}
                >
                  {section.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bar + stats row */}
      <div className="space-y-2">
        {/* Main progress bar */}
        <div className="relative w-full h-2 bg-white/[0.04] rounded-full overflow-hidden backdrop-blur-sm">
          {/* Base shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-shimmer" />

          {/* Actual progress */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${displayPercent}%` }}
          >
            {/* Gradient fill */}
            <div className="h-full w-full rounded-full bg-gradient-to-r from-brand-400 via-gold-400 to-brand-300 relative overflow-hidden">
              {/* Inner shimmer */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-fast"
              />
              {/* Glow */}
              <div className="absolute inset-0 rounded-full bg-brand-400/30 blur-sm" />
            </div>
          </div>

          {/* Tick marks */}
          {[25, 50, 75].map(pct => (
            <div
              key={pct}
              className="absolute top-0 bottom-0 w-px bg-white/20"
              style={{ left: `${pct}%` }}
            />
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {/* Percentage */}
            <span className="tabular-nums font-mono text-zinc-300 font-semibold">
              {displayPercent}%
            </span>

            {/* Token count */}
            <span className="text-zinc-600 tabular-nums font-mono">
              {tokenCount}/{maxTokens} tokens
            </span>

            {/* Current section */}
            {currentSectionIndex >= 0 && !streamDone && (
              <span className="flex items-center gap-1.5 text-brand-400/80">
                <Star className="w-3 h-3" />
                <span className="animate-pulse">{SECTIONS[currentSectionIndex].icon} {SECTIONS[currentSectionIndex].label}</span>
              </span>
            )}
          </div>

          {/* Right side — completion */}
          <span className="text-zinc-700">
            {streamDone ? (
              <span className="flex items-center gap-1.5 text-gold-400">
                <Sparkles className="w-3 h-3" />
                Reading complete
              </span>
            ) : tokenCount === 0 ? (
              "Preparing..."
            ) : (
              "Generating..."
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
