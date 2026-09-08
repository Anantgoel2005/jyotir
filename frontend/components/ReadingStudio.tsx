"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  CircleDot,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import { deleteChart, getChart, readNdjson, retryGeneration } from "@/lib/api"
import type { Chart, StreamEvent } from "@/lib/types"
import { useLang } from "@/lib/lang"

type Tab = "overview" | "chart" | "reading" | "ask"

export function ReadingStudio({ chartId }: { chartId: string }) {
  const router = useRouter()
  const { t } = useLang()
  const [chart, setChart] = useState<Chart>()
  const [tab, setTab] = useState<Tab>("overview")
  const [draft, setDraft] = useState("")
  const [streamError, setStreamError] = useState("")
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController>()

  const load = useCallback(async () => {
    try {
      const next = await getChart(chartId)
      setChart(next)
      setDraft(next.breakdown || next.breakdown_draft || "")
      return next
    } catch {
      setStreamError("READING_NOT_FOUND")
    } finally {
      setLoading(false)
    }
  }, [chartId])

  const connect = useCallback(async (attempt = 0) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      await readNdjson(`charts/${chartId}/generation/stream`, (event: StreamEvent) => {
        if (event.type === "snapshot") {
          setDraft(event.data.draft || "")
          setChart((current) => current ? { ...current, status: event.data.status } : current)
        } else if (event.type === "token") {
          setDraft((current) => current + event.data)
          setChart((current) => current ? { ...current, status: "generating" } : current)
        } else if (event.type === "complete") {
          load()
        } else if (event.type === "error") {
          setChart((current) => current ? { ...current, status: "failed" } : current)
          setStreamError(event.data.code)
        }
      }, { signal: controller.signal })
    } catch {
      if (!controller.signal.aborted && attempt < 2) {
        window.setTimeout(() => connect(attempt + 1), 1000 * (attempt + 1))
      } else if (!controller.signal.aborted) {
        setStreamError("STREAM_UNAVAILABLE")
        const poll = window.setInterval(async () => {
          const current = await load()
          if (!current || current.status === "ready" || current.status === "failed") {
            window.clearInterval(poll)
          }
        }, 4000)
        window.setTimeout(() => window.clearInterval(poll), 120000)
      }
    }
  }, [chartId, load])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
    load().then((current) => {
      if (current && current.status !== "ready") connect()
    })
    return () => abortRef.current?.abort()
  }, [load, connect])

  const retry = async () => {
    setStreamError("")
    await retryGeneration(chartId)
    setChart((current) => current ? { ...current, status: "pending" } : current)
    connect()
  }

  const remove = async () => {
    if (!window.confirm(t("deleteConfirm"))) return
    await deleteChart(chartId)
    router.push("/")
  }

  if (loading) return <StudioLoading />
  if (!chart) return <div className="empty-state"><h1>{t("readingNotFound")}</h1><button className="button secondary" onClick={() => router.push("/")}>{t("returnHome")}</button></div>

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: t("overview"), icon: Sparkles },
    { id: "chart", label: t("chart"), icon: CircleDot },
    { id: "reading", label: t("interpretation"), icon: BookOpen },
    { id: "ask", label: t("ask"), icon: MessageCircle },
  ]

  return (
    <div className={`studio-page ${chart.system}`}>
      <div className="studio-masthead">
        <button className="back-link" onClick={() => router.push("/")}><ArrowLeft size={15} /> {t("newReading")}</button>
        <div className="reading-meta">
          <span>{chart.system}</span><i />
          <span>{chart.birth_date}</span><i />
          <span>{chart.birth_city}</span>
        </div>
        <button className="delete-link" onClick={remove}><Trash2 size={15} /> <span>{t("delete")}</span></button>
      </div>

      <header className="reading-header">
        <div>
          <p className="section-kicker">{t("reading")} · {chart.system}</p>
          <h1>{chart.person_name}</h1>
          <p>{chart.birth_date} {t("at")} {chart.birth_time} · {chart.birth_city}, {chart.birth_country}</p>
        </div>
        <StatusMedallion chart={chart} />
      </header>

      <nav className="studio-tabs" aria-label="Reading sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)} aria-label={label}>
            <Icon size={16} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {chart.status !== "ready" && tab === "overview" && (
        <GenerationPanel chart={chart} draft={draft} error={streamError} onRetry={retry} />
      )}

      {chart.status === "ready" && tab === "overview" && (
        <section className="studio-overview">
          <SystemVisual chart={chart} />
          <div className="overview-reading">
            <p className="section-kicker">{t("atGlance")}</p>
            <h2>{t("patternBrief")}</h2>
            <ReadingText text={(chart.breakdown || "").split("\n").slice(0, 12).join("\n")} />
            <button className="text-link" onClick={() => setTab("reading")}>{t("continueReading")} <ArrowLeft size={14} className="arrow-right" /></button>
          </div>
        </section>
      )}

      {tab === "chart" && (
        <section className="chart-section">
          <div className="section-heading"><p className="section-kicker">{t("calculatedChart")}</p><h2>{t(chart.system)} {t("architecture")}</h2></div>
          <SystemVisual chart={chart} expanded />
          <details className="calculation-details"><summary>{t("provenance")}</summary><pre>{JSON.stringify(chart.calculation, null, 2)}</pre></details>
        </section>
      )}

      {chart.status === "ready" && tab === "reading" && (
        <article className="long-reading">
          <aside><p>{t("interpretation")}</p><span /><small>{t("generatedWith")}</small></aside>
          <div><ReadingText text={chart.breakdown || ""} /></div>
        </article>
      )}

      {chart.status !== "ready" && tab === "reading" && (
        draft
          ? <article className="long-reading partial-reading" aria-live="polite">
              <aside><p>{t("readingProgress")}</p><span /><small>{t("latestDraft")}</small></aside>
              <div><ReadingText text={draft} /></div>
            </article>
          : <GenerationPanel chart={chart} draft="" error={streamError} onRetry={retry} />
      )}

      {chart.status === "ready" && tab === "ask" && <ChatStudio chartId={chart.id} />}
      {chart.status !== "ready" && tab === "ask" && (
        <GenerationPanel chart={chart} draft={draft} error={streamError} onRetry={retry} />
      )}
    </div>
  )
}

function StatusMedallion({ chart }: { chart: Chart }) {
  const symbol = chart.system === "tropical" ? "☉" : chart.system === "vedic" ? "ॐ" : "天"
  return <div className={`status-medallion ${chart.status}`}><span>{symbol}</span><small>{chart.status}</small></div>
}

function GenerationPanel({ chart, draft, error, onRetry }: { chart: Chart; draft: string; error: string; onRetry: () => void }) {
  const { t } = useLang()
  const failed = chart.status === "failed" || Boolean(error)
  return (
    <section className="generation-panel" aria-live="polite">
      <div className="generation-orbit"><span>{failed ? "!" : "✦"}</span></div>
      <div className="generation-copy">
        <p className="section-kicker">{failed ? t("generationPaused") : `Pass ${Math.max(1, chart.generation_attempts)} · ${t("composing")}`}</p>
        <h2>{failed ? t("generationRetryTitle") : t("preparing")}</h2>
        <p>{failed ? t("safeRetry") : t("preparingBody")}</p>
        {failed && <button className="button secondary" onClick={onRetry}><RefreshCw size={15} /> {t("retry")}</button>}
      </div>
      {draft && <div className="draft-preview"><div className="fade-mask" /><ReadingText text={draft.slice(-1600)} /></div>}
    </section>
  )
}

function SystemVisual({ chart, expanded = false }: { chart: Chart; expanded?: boolean }) {
  const { t } = useLang()
  if (chart.system === "bazi") {
    const pillars = chart.calculation.pillars || {}
    return (
      <div className={expanded ? "system-visual bazi-visual expanded" : "system-visual bazi-visual"}>
        <div className="visual-caption"><small>{t("fourPillars")}</small><span>{t("elementalArchitecture")}</span></div>
        <div className="pillars">
          {Object.entries(pillars).map(([name, value]: [string, any]) => (
            <div className="pillar" key={name}><small>{name}</small><strong>{value.characters}</strong><span>{value.transliteration}</span><i>{(value.elements || []).join(" · ")}</i></div>
          ))}
        </div>
        <div className="element-balance">
          {Object.entries(chart.calculation.element_balance || {}).map(([element, count]: any) => (
            <span key={element} style={{ "--weight": count } as React.CSSProperties}>{element}<i>{count}</i></span>
          ))}
        </div>
        {expanded && <ChartGuide system={chart.system} />}
      </div>
    )
  }
  const isVedic = chart.system === "vedic"
  const markers = [
    { glyph: "ASC", label: "Ascendant", x: 3, y: 1 },
    { glyph: "☉", label: "Sun", x: 4, y: 1 },
    { glyph: "☽", label: "Moon", x: 5, y: 2 },
    { glyph: "☿", label: "Mercury", x: 5, y: 3 },
    { glyph: "♀", label: "Venus", x: 5, y: 4 },
    { glyph: "♂", label: "Mars", x: 4, y: 5 },
    { glyph: "♃", label: "Jupiter", x: 3, y: 5 },
    { glyph: "♄", label: "Saturn", x: 2, y: 5 },
    { glyph: "♅", label: "Uranus", x: 1, y: 4 },
    { glyph: "♆", label: "Neptune", x: 1, y: 3 },
    { glyph: "♇", label: "Pluto", x: 1, y: 2 },
    { glyph: "☊", label: "Node", x: 2, y: 1 },
  ]
  return (
    <div className={expanded ? "system-visual wheel-visual expanded" : "system-visual wheel-visual"}>
      <div className="visual-caption"><small>{chart.system === "vedic" ? t("siderealMap") : t("natalMap")}</small><span>{chart.birth_city} · {chart.birth_time}</span></div>
      <div className={isVedic ? "chart-diagram vedic-diagram" : "chart-diagram tropical-diagram"} aria-label={`${chart.system} chart visualization`}>
        {isVedic ? (
          <svg className="vedic-lines" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M50 5 L95 50 L50 95 L5 50 Z" />
            <path d="M50 5 L50 95 M5 50 L95 50" />
            <path d="M50 5 L95 50 M95 50 L50 95 M50 95 L5 50 M5 50 L50 5" />
            <path d="M28 28 L72 28 L72 72 L28 72 Z" />
            <path d="M28 28 L72 72 M72 28 L28 72" />
          </svg>
        ) : (
          <div className="tropical-rings" aria-hidden="true">
            <i /><i /><i />
          </div>
        )}
        <div className="marker-grid">
          {markers.map((marker) => (
            <span
              className="planet-marker"
              key={marker.label}
              style={{ "--x": marker.x, "--y": marker.y } as React.CSSProperties}
              title={marker.label}
            >
              {marker.glyph}
            </span>
          ))}
        </div>
        <div className="wheel-core">{isVedic ? "ॐ" : "✦"}<small>{chart.person_name.slice(0, 1)}</small></div>
      </div>
      {expanded && <ChartGuide system={chart.system} />}
    </div>
  )
}

function ChartGuide({ system }: { system: Chart["system"] }) {
  const { t } = useLang()
  const items = system === "bazi"
    ? [
        [t("guideBaziPillarsTitle"), t("guideBaziPillarsBody")],
        [t("guideBaziElementsTitle"), t("guideBaziElementsBody")],
        [t("guideBaziFirstTitle"), t("guideBaziFirstBody")],
      ]
    : system === "vedic"
      ? [
          [t("guideVedicShapeTitle"), t("guideVedicShapeBody")],
          [t("guidePlanetsTitle"), t("guidePlanetsBody")],
          [t("guideVedicFirstTitle"), t("guideVedicFirstBody")],
        ]
      : [
          [t("guideTropicalRingsTitle"), t("guideTropicalRingsBody")],
          [t("guidePlanetsTitle"), t("guidePlanetsBody")],
          [t("guideTropicalFirstTitle"), t("guideTropicalFirstBody")],
        ]

  return (
    <aside className="chart-guide" aria-label={t("chartGuideTitle")}>
      <div>
        <p className="section-kicker">{t("chartGuideKicker")}</p>
        <h3>{t("chartGuideTitle")}</h3>
      </div>
      <dl>
        {items.map(([title, body]) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{body}</dd>
          </div>
        ))}
      </dl>
    </aside>
  )
}

function ReadingText({ text }: { text: string }) {
  return (
    <div className="reading-prose">
      {text.split("\n").map((line, index) => {
        const clean = line.replace(/\*\*/g, "").trim()
        if (!clean) return <div className="prose-space" key={index} />
        if (/^#{1,3}\s/.test(clean)) return <h2 key={index}>{clean.replace(/^#{1,3}\s*/, "")}</h2>
        if (/^[-•]\s/.test(clean)) return <p className="prose-bullet" key={index}><span>✦</span>{clean.replace(/^[-•]\s*/, "")}</p>
        return <p key={index}>{clean}</p>
      })}
    </div>
  )
}

function ChatStudio({ chartId }: { chartId: string }) {
  const { t } = useLang()
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const abort = useRef<AbortController>()
  useEffect(() => () => abort.current?.abort(), [])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    const message = input.trim()
    if (!message || sending) return
    setInput("")
    setSending(true)
    setMessages((items) => [...items, { role: "user", content: message }, { role: "assistant", content: "" }])
    const controller = new AbortController()
    abort.current = controller
    try {
      await readNdjson(`charts/${chartId}/chat`, (chunk) => {
        if (chunk.type === "token") {
          setMessages((items) => items.map((item, index) => index === items.length - 1 ? { ...item, content: item.content + chunk.data } : item))
        }
      }, {
        method: "POST",
        body: JSON.stringify({ message }),
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="chat-studio">
      <div className="chat-intro"><p className="section-kicker">{t("privateConsultation")}</p><h2>{t("ask")}</h2><p>{t("chatIntro")}</p></div>
      <div className="chat-window">
        <div className="messages" aria-live="polite">
          {messages.length === 0 && <div className="assistant-welcome"><span>✦</span><p>{t("chatWelcome")}</p></div>}
          {messages.map((message, index) => <div className={`message ${message.role}`} key={index}><small>{message.role === "user" ? t("you") : "JYOTIR"}</small><ReadingText text={message.content || "…"} /></div>)}
        </div>
        <form onSubmit={send}><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={4000} placeholder={t("askPlaceholder")} disabled={sending} /><button aria-label={t("send")} disabled={sending || !input.trim()}>{sending ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button></form>
      </div>
    </section>
  )
}

function StudioLoading() {
  const { t } = useLang()
  return <div className="studio-loading"><div className="generation-orbit"><span>✦</span></div><p>{t("opening")}</p></div>
}
