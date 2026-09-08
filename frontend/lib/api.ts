import type {
  BirthData,
  Chart,
  ChartSummary,
  LocationResult,
  StreamEvent,
} from "./types"

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "REQUEST_FAILED" }))
    const detail = typeof body.detail === "string" ? body.detail : body.detail?.code
    throw new Error(detail || "REQUEST_FAILED")
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

export const listCharts = () => api<ChartSummary[]>("charts")
export const getChart = (id: string) => api<Chart>(`charts/${id}`)
export const createChart = (data: BirthData) =>
  api<{ chart_id: string; status: string }>("charts", {
    method: "POST",
    body: JSON.stringify(data),
  })
export const deleteChart = (id: string) =>
  api<void>(`charts/${id}`, { method: "DELETE" })
export const retryGeneration = (id: string) =>
  api(`charts/${id}/generation`, { method: "POST" })
export const searchLocations = (query: string, language: string, signal?: AbortSignal) =>
  api<LocationResult[]>(
    `locations?query=${encodeURIComponent(query)}&language=${language}`,
    { signal },
  )

export async function readNdjson(
  path: string,
  onEvent: (event: StreamEvent) => void,
  init?: RequestInit,
) {
  const response = await fetch(`/api/${path}`, init)
  if (!response.ok || !response.body) throw new Error("STREAM_UNAVAILABLE")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line))
    }
    if (done) break
  }
}
