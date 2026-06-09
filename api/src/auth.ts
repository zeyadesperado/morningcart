import type { FastifyReply, FastifyRequest } from 'fastify'
import { unauthorized } from './lib/errors'

const COOKIE = 'mc_user'
const THIRTY_DAYS = 60 * 60 * 24 * 30

// Identity seam: today it's "pick your name" in a signed cookie. Swap the body
// of currentUser/setUser for OIDC/SSO later without touching any handler.
export function currentUser(req: FastifyRequest): string | null {
  const raw = req.cookies[COOKIE]
  if (!raw) return null
  const un = req.unsignCookie(raw)
  return un.valid && un.value ? un.value : null
}

export function requireUser(req: FastifyRequest): string {
  const u = currentUser(req)
  if (!u) throw unauthorized()
  return u
}

export function setUser(reply: FastifyReply, name: string): void {
  reply.setCookie(COOKIE, name, {
    httpOnly: true,
    sameSite: 'strict', // SPA is same-origin; strict blocks cross-site CSRF on bodyless POSTs
    path: '/',
    signed: true,
    maxAge: THIRTY_DAYS,
  })
}

export function clearUser(reply: FastifyReply): void {
  reply.clearCookie(COOKIE, { path: '/' })
}
