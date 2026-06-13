"use client"

import { Clock, FileText } from "lucide-react"

interface Props { text: string }

export function ReadingMeta({ text }: Props) {
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0
  const mins = Math.max(1, Math.round(words / 200))
  // Rough section count
  const sectionCount = (text?.match(/^##\s/gm) || []).length

  return (
    <div className="flex items-center gap-4 text-[10px] text-zinc-500">
      <span className="flex items-center gap-1">
        <FileText className="w-3 h-3" />
        {words.toLocaleString()} words
      </span>
      <span className="text-zinc-700">·</span>
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {mins} min read
      </span>
      {sectionCount > 0 && (
        <>
          <span className="text-zinc-700">·</span>
          <span>{sectionCount} sections</span>
        </>
      )}
    </div>
  )
}
