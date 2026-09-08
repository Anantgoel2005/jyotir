export type AstroSystem = "tropical" | "vedic" | "bazi"
export type ChartStatus = "pending" | "generating" | "ready" | "failed"

export interface BirthData {
  system: AstroSystem
  person_name: string
  birth_date: string
  birth_time: string
  birth_timezone: string
  birth_city: string
  birth_country: string
  birth_latitude: number
  birth_longitude: number
  gender?: "male" | "female"
}

export interface ChartSummary {
  id: string
  system: AstroSystem
  person_name: string
  birth_date: string
  birth_city: string
  status: ChartStatus
  created_at: string
}

export interface Chart extends ChartSummary {
  birth_time: string
  birth_timezone: string
  birth_country: string
  birth_latitude: number
  birth_longitude: number
  gender?: string
  calculation: Record<string, any>
  breakdown?: string
  breakdown_draft?: string
  breakdown_model?: string
  error_code?: string
  error_message?: string
  generation_attempts: number
  breakdown_at?: string
}

export interface LocationResult {
  id: string
  name: string
  country: string
  admin1?: string
  latitude: number
  longitude: number
  timezone: string
}

export interface StreamEvent<T = any> {
  type: "snapshot" | "progress" | "token" | "complete" | "error"
  chart_id: string
  sequence: number
  data: T
}
