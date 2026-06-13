"use client"

import { useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Send, Sparkles, User, Loader2 } from "lucide-react"
import { useLang } from "@/lib/lang"

interface Props {
  chartId: string
}

export function ChatPanel({ chartId }: Props) {
  const { t } = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat/" + chartId,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])


  // ── Markdown renderer for chat ──────────────────────
  function renderMarkdown(text: string) {
    return text.split("\n").map(function (line, i) {
      // ### heading
      if (line.match(/^###\s/)) {
        return (
          <h4 key={i} className="text-xs font-bold text-amber-300 mt-3 mb-1.5 border-b border-amber-500/10 pb-1">
            {line.replace(/^###\s+/, "")}
          </h4>
        )
      }
      // ## heading
      if (line.match(/^##\s/)) {
        return (
          <h3 key={i} className="text-sm font-bold text-gold-spiritual mt-4 mb-2" style={{ fontFamily: "var(--font-playfair)" }}>
            {line.replace(/^##\s+/, "").replace(/\*\*/g, "")}
          </h3>
        )
      }
      // Bullet point
      if (line.trim().match(/^[-•]\s/)) {
        return (
          <div key={i} className="flex gap-2 pl-2 text-sm leading-relaxed">
            <span className="text-amber-400/40 mt-1 flex-shrink-0">•</span>
            <span className="text-zinc-300">{renderInline(line.replace(/^[-•]\s+/, ""))}</span>
          </div>
        )
      }
      // Numbered list
      if (line.trim().match(/^\d+\.\s/)) {
        const num = line.trim().match(/^(\d+)/)?.[1]
        return (
          <div key={i} className="flex gap-2 pl-2 text-sm leading-relaxed">
            <span className="text-amber-400/50 mt-0.5 flex-shrink-0 text-xs font-mono">{num}.</span>
            <span className="text-zinc-300">{renderInline(line.replace(/^\d+\.\s+/, ""))}</span>
          </div>
        )
      }
      // Horizontal rule
      if (line.trim() === "---" || line.trim() === "***") {
        return <div key={i} className="my-2 border-t border-amber-500/10" />
      }
      // Empty line
      if (line.trim() === "") {
        return <div key={i} className="h-1.5" />
      }
      // Blockquote (starts with >)
      if (line.trim().startsWith("> ")) {
        return (
          <div key={i} className="border-l-2 border-amber-400/30 pl-3 py-1 my-1.5 text-sm text-zinc-400 italic">
            {line.replace(/^>\s*/, "")}
          </div>
        )
      }
      // Regular paragraph
      return <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-1.5">{renderInline(line)}</p>
    })
  }

  // ── Inline formatting (bold, italic) ─────────────────
  function renderInline(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map(function (part, i) {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-amber-200 font-semibold">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i} className="text-zinc-400 italic">{part.slice(1, -1)}</em>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <section className="max-w-3xl mx-auto">
      {/* Ornate divider with Om */}
      <div className="divider-ornate mb-8">
        <span className="text-amber-400/30 text-lg" style={{ fontFamily: "serif" }}>ॐ</span>
        <span className="text-sm text-zinc-600 flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          {t("lang") === "hi" ? "ज्योतिर से अपनी कुंडली के बारे में पूछें" : "Ask Jyotir about your chart"}
        </span>
        <span className="text-amber-400/30 text-lg" style={{ fontFamily: "serif" }}>ॐ</span>
      </div>

      {/* Chat container with ornate border */}
      <div className="card-ornate overflow-hidden">
        <div ref={scrollRef} className="h-[500px] overflow-y-auto px-6 py-4 space-y-4">
          {/* Welcome — spiritual greeting */}
          {messages.length === 0 && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-amber-500/20">
                <span className="text-white text-sm" style={{ fontFamily: "serif" }}>ॐ</span>
              </div>
              <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed bg-amber-500/[0.03] border border-amber-500/10 text-zinc-300 rounded-bl-md">
                {t("welcomeMessage")}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={"flex gap-3 animate-fade-in " + (msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-amber-500/20">
                  <span className="text-white text-sm" style={{ fontFamily: "serif" }}>ॐ</span>
                </div>
              )}

              <div
                className={"max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed " + (
                  msg.role === "user"
                    ? "bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-400/20 text-zinc-200 rounded-br-md"
                    : "bg-amber-500/[0.03] border border-amber-500/10 text-zinc-300 rounded-bl-md"
                )}
              >
                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-amber-500/20">
                <span className="text-white text-sm" style={{ fontFamily: "serif" }}>ॐ</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 rounded-bl-md">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-100" />
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input with gold border */}
        <form onSubmit={handleSubmit} className="border-t border-amber-500/10 px-4 py-3 flex items-center gap-3 bg-amber-500/[0.02]">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder={t("askAbout")}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-amber-500/25"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </form>
      </div>

      {/* Disclaimer with Sanskrit accent */}
      <p className="text-xs text-zinc-700 text-center mt-4 flex items-center justify-center gap-2">
        <span className="text-amber-400/20" style={{ fontFamily: "serif" }}>ॐ</span>
        {t("disclaimer")}
        <span className="text-amber-400/20" style={{ fontFamily: "serif" }}>ॐ</span>
      </p>
    </section>
  )
}
