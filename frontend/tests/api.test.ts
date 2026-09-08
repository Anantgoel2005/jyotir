import { describe, expect, it, vi } from "vitest"
import { readNdjson } from "@/lib/api"

describe("NDJSON stream reader", () => {
  it("parses split chunks and emits typed events", async () => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('{"type":"snapshot","chart_id":"one","sequence":0,"data":{"draft":"a"}}\n{"type":"to'))
        controller.enqueue(encoder.encode('ken","chart_id":"one","sequence":1,"data":"b"}\n'))
        controller.close()
      },
    })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(stream, { status: 200 })))
    const events: any[] = []
    await readNdjson("charts/one/generation/stream", (event) => events.push(event))
    expect(events.map((event) => event.type)).toEqual(["snapshot", "token"])
    expect(events[1].data).toBe("b")
  })

  it("rejects failed stream responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    await expect(readNdjson("broken", () => {})).rejects.toThrow("STREAM_UNAVAILABLE")
  })
})
