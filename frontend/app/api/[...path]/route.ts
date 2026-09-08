import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_API_URL || "http://localhost:9000"
const COOKIE = "jyotir_session"

async function newSession(): Promise<string> {
  const response = await fetch(`${BACKEND}/api/v1/sessions`, {
    method: "POST",
    cache: "no-store",
  })
  if (!response.ok) throw new Error("SESSION_UNAVAILABLE")
  return (await response.json()).token
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params
  let token = (await cookies()).get(COOKIE)?.value
  let created = false
  if (!token) {
    token = await newSession()
    created = true
  }

  const target = new URL(`${BACKEND}/api/v1/${params.path.join("/")}`)
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value))
  const body = request.method === "GET" || request.method === "HEAD"
    ? undefined
    : await request.arrayBuffer()
  const forward = () => fetch(target, {
    method: request.method,
    body,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request.headers.get("content-type")
        ? { "Content-Type": request.headers.get("content-type")! }
        : {}),
      "X-Forwarded-For": request.headers.get("x-forwarded-for") || "next-proxy",
      "X-Request-ID": crypto.randomUUID(),
    },
  })

  let upstream = await forward()
  if (upstream.status === 401) {
    token = await newSession()
    created = true
    upstream = await forward()
  }
  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  })
  if (created) {
    response.cookies.set(COOKIE, token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return response
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const DELETE = proxy
