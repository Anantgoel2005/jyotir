interface Env {
  BACKEND_API_URL?: string
}

const COOKIE = "jyotir_session"

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  const pairs = header.split(";")
  const map: Record<string, string> = {}
  for (const pair of pairs) {
    const idx = pair.indexOf("=")
    if (idx > -1) {
      const key = pair.slice(0, idx).trim()
      const val = pair.slice(idx + 1).trim()
      map[key] = val
    }
  }
  return map
}

interface PagesContext<TEnv = unknown> {
  request: Request
  env: TEnv
  params: Record<string, string | string[]>
  waitUntil: (promise: Promise<unknown>) => void
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
  data: Record<string, unknown>
}

export const onRequest = async (context: PagesContext<Env>): Promise<Response> => {
  const backend = context.env.BACKEND_API_URL || "https://jyotir-api.onrender.com"
  const request = context.request
  const url = new URL(request.url)

  // Extract path following /api/
  const apiPath = url.pathname.replace(/^\/api\/?/, "")
  const targetUrl = new URL(`${backend}/api/v1/${apiPath}`)
  url.searchParams.forEach((value, key) => targetUrl.searchParams.append(key, value))

  const cookies = parseCookies(request.headers.get("Cookie"))
  let token = cookies[COOKIE]
  let created = false

  async function newSession(): Promise<string> {
    const res = await fetch(`${backend}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    if (!res.ok) throw new Error("SESSION_UNAVAILABLE")
    const data: any = await res.json()
    return data.token
  }

  if (!token) {
    try {
      token = await newSession()
      created = true
    } catch {
      return new Response(JSON.stringify({ detail: "Backend session unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  const forward = async (bearerToken: string) => {
    const headers = new Headers(request.headers)
    headers.set("Authorization", `Bearer ${bearerToken}`)
    headers.set("X-Forwarded-For", request.headers.get("cf-connecting-ip") || "cloudflare-proxy")
    headers.set("X-Request-ID", crypto.randomUUID())

    const body =
      request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer()

    return fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
    })
  }

  let upstream: Response
  try {
    upstream = await forward(token)
    if (upstream.status === 401) {
      token = await newSession()
      created = true
      upstream = await forward(token)
    }
  } catch {
    return new Response(JSON.stringify({ detail: "Error communicating with backend" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    })
  }

  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.set("Cache-Control", "no-store")

  if (created && token) {
    responseHeaders.append(
      "Set-Cookie",
      `${COOKIE}=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    )
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  })
}
