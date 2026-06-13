// lib/api.ts — API client for the Jyotir backend

import { BirthData, Chart } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api"

export async function submitBirthData(data: BirthData): Promise<{ chart_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Failed to calculate chart")
  }
  return res.json()
}

export async function fetchChart(chartId: string): Promise<Chart> {
  const res = await fetch(`${API_BASE}/chart/${chartId}`)
  if (!res.ok) throw new Error("Chart not found")
  return res.json()
}

export async function pollChartUntilReady(chartId: string, intervalMs = 2000, maxAttempts = 60): Promise<Chart> {
  for (let i = 0; i < maxAttempts; i++) {
    const chart = await fetchChart(chartId)
    if (chart.status === "ready" || chart.status === "failed") return chart
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error("Chart generation timed out")
}

export async function deleteChart(chartId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/chart/${chartId}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Failed to delete chart")
}
