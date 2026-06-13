"use client"

import { useState, useRef, useEffect } from "react"
import { SystemSelector } from "@/components/SystemSelector"
import { BirthDataForm } from "@/components/BirthDataForm"
import { BreakdownDisplay } from "@/components/BreakdownDisplay"

import { ChatPanel } from "@/components/ChatPanel"
import { Chart } from "@/lib/types"
import { fetchChart } from "@/lib/api"
import { useLang } from "@/lib/lang"
import { Sparkles } from "lucide-react"

type Step = "system" | "form" | "streaming" | "result"

export default function Home() {
  const { t } = useLang()
  const [step, setStep] = useState<Step>("system")
  const [system, setSystem] = useState<"tropical" | "vedic" | "bazi" | null>(null)
  const [chart, setChart] = useState<Chart | null>(null)

  const [streamingPerson, setStreamingPerson] = useState("")
  const [streamingTokens, setStreamingTokens] = useState("")
  const [streamDone, setStreamDone] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const streamDoneRef = useRef(false)
  const resolvedRef = useRef(false)

  const handleSystemSelect = (s: "tropical" | "vedic" | "bazi") => {
    setSystem(s)
    setStep("form")
  }

  const handleFormBack = () => {
    setStep("system")
    setSystem(null)
  }

  const handleStreamingBreakdown = (chartId: string, personName: string) => {
    setStreamingPerson(personName)
    setStreamingTokens("")
    setStreamDone(false)
    streamDoneRef.current = false
    resolvedRef.current = false
    setStep("streaming")

    const apiBase = process.env.NEXT_PUBLIC_API_URL || ""
    const eventSource = new EventSource(apiBase + "/api/chart/" + chartId + "/breakdown-stream")

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.token) {
          setStreamingTokens(function (prev) { return prev + data.token })
        } else if (data.done) {
          eventSource.close()
          setStreamDone(true)
          streamDoneRef.current = true
          if (!resolvedRef.current) {
            resolvedRef.current = true
            fetchChart(chartId).then(function (c) {
              setTimeout(function () {
                setChart(c)
                setStep("result")
              }, 800)
            })
          }
        } else if (data.error) {
          eventSource.close()
          streamDoneRef.current = true
          setStreamingTokens(function (prev) {
            return prev + String.fromCharCode(10, 10) + "*Error: " + data.error + "*"
          })
          setStreamDone(true)
        }
      } catch (_) { /* ignore parse errors */ }
    }

    eventSource.onerror = function () {
      eventSource.close()
      if (!streamDoneRef.current && !resolvedRef.current) {
        var poll = setInterval(async function () {
          try {
            var c = await fetchChart(chartId)
            if (c.status === "ready" || c.status === "failed") {
              clearInterval(poll)
              if (!resolvedRef.current) {
                resolvedRef.current = true
                setChart(c)
                setStep("result")
              }
            }
          } catch (_) { /* ignore */ }
        }, 2000)
      }
    }
  }

  useEffect(function () {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamingTokens])

  return (
    <div className="px-6 py-8">
      {step === "system" && (
        <div className="animate-fade-in">
          <SystemSelector onSelect={handleSystemSelect} />
        </div>
      )}

      {step === "form" && system && (
        <div className="animate-slide-up">
          <BirthDataForm
            system={system}
            onBack={handleFormBack}
            onStreamingBreakdown={handleStreamingBreakdown}
          />
        </div>
      )}

      {step === "streaming" && (
        <div className="animate-fade-in">
          {/* Hero cosmic section */}
          <div className="relative max-w-4xl mx-auto">
            {/* Side decorations */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 hidden lg:flex flex-col items-center gap-6 text-zinc-700 text-xs">
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent" />
              <span className="tracking-widest writing-vertical rotate-180" style={{ writingMode: "vertical-rl" }}>COSMIC</span>
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent" />
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 hidden lg:flex flex-col items-center gap-6 text-zinc-700 text-xs">
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent" />
              <span className="tracking-widest" style={{ writingMode: "vertical-rl" }}>READING</span>
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent" />
            </div>

            {/* Main header */}
            <div className="text-center pt-6 pb-2">
              <div className="text-amber-400/[0.06] text-7xl mb-1 font-serif">ॐ</div>

              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-400/5 border border-amber-400/15 text-amber-300/70 text-[11px] mb-4 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-serif text-xs">ॐ</span>
                <span>{streamDone ? t("readingComplete") : t("generating")}</span>
                <span className="font-serif text-xs">ॐ</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>

              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gold-spiritual" style={{ fontFamily: "var(--font-playfair)" }}>
                {streamingPerson}{t("lang") === "hi" ? " का " : "'s "}{t("cosmicBlueprint")}
              </h2>
              <p className="text-zinc-500 text-sm max-w-md mx-auto">
                {streamDone ? t("personalized") : t("analyzing")}
              </p>
            </div>

            {/* Cosmic progress — loader + progress bar */}
            <div className="my-2">
              <CosmicProgress tokenCount={tokenCount} maxTokens={8192} streamingText={streamingTokens} streamDone={streamDone} system={system || "vedic"} />
            </div>

            {/* Constellation count */}
            {!streamDone && (
              <div className="flex items-center justify-center gap-6 text-[10px] text-zinc-600 mb-4">
                <CosmicProgress tokenCount={tokenCount} maxTokens={8192} streamingText={streamingTokens} streamDone={streamDone} system={system || "vedic"} />
              </div>
            )}

            {/* Divider — only when tokens are flowing */}
            {streamingTokens && (
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />
                <span className="text-zinc-600 text-[10px] tracking-widest uppercase">
                  {streamDone ? "✦ Your Reading ✦" : "✦ Real-time Generation ✦"}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />
              </div>
            )}
          </div>

          {/* Streaming text — only shown once tokens arrive */}
          {streamingTokens && (
            <div className="max-w-3xl mx-auto animate-fade-in">
              <div
                ref={scrollRef}
                className="h-[50vh] overflow-y-auto p-6 rounded-2xl border border-amber-500/8 bg-gradient-to-b from-white/[0.02] to-transparent"
              >
                <article className="prose prose-invert prose-zinc max-w-none">
                  {streamingTokens.split(String.fromCharCode(10)).map(function (line, i) {
                    if (line.match(/^#+\s/)) {
                      return (
                        <h2
                          key={i}
                          className="text-lg font-bold mt-6 mb-2 text-gold-spiritual"
                          style={{ fontFamily: "var(--font-playfair)" }}
                        >
                          {line.replace(/^#+\s/, "").replace(/\*\*/g, "")}
                        </h2>
                      )
                    }
                    if (line.match(/^[A-Z][A-Z\s&-]{4,}$/) && line.trim().length < 60) {
                      return (
                        <h3 key={i} className="text-sm font-semibold mt-4 mb-1.5 text-amber-300/70 uppercase tracking-wide">
                          {line}
                        </h3>
                      )
                    }
                    if (line.trim() === "") {
                      return <div key={i} className="h-2" />
                    }
                    return <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-2">{line}</p>
                  })}
                </article>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "result" && chart && (
        <div className="animate-fade-in space-y-10">
          <BreakdownDisplay chart={chart} />
          <ChatPanel chartId={chart.id} />
        </div>
      )}
    </div>
  )
}
