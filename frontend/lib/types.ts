// lib/types.ts — shared TypeScript types

export type AstroSystem = "tropical" | "vedic" | "bazi"

export interface BirthData {
  system: AstroSystem
  person_name: string
  birth_date: string       // YYYY-MM-DD
  birth_time: string       // HH:MM
  birth_timezone: string   // IANA e.g. "Asia/Kolkata"
  birth_city: string
  birth_country: string
  birth_latitude: number
  birth_longitude: number
  gender?: string
  ayanamsha?: string
}

export interface Chart {
  id: string
  user_id: string
  system: AstroSystem
  person_name: string
  birth_date: string
  birth_time: string
  birth_timezone: string
  birth_city: string
  birth_country: string
  birth_latitude: number
  birth_longitude: number
  gender?: string
  raw_chart: Record<string, any>
  enriched_chart: Record<string, any>
  breakdown?: string
  breakdown_model?: string
  status: "pending" | "calculating" | "ready" | "failed"
  error_message?: string
  created_at: string
}

export interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  token_count?: number
  created_at: string
}

export interface Conversation {
  id: string
  chart_id: string
  title: string
  message_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}
