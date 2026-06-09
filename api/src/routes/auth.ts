import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { COLLEAGUES } from '@morningcart/shared'
import { clearUser, currentUser, setUser } from '../auth'
import { badRequest } from '../lib/errors'

export async function authRoutes(app: FastifyInstance) {
  app.get('/api/auth/me', async (req) => ({ user: currentUser(req) }))

  app.get('/api/colleagues', async () => ({ colleagues: COLLEAGUES }))

  app.post('/api/auth/login', async (req, reply) => {
    const { name } = z.object({ name: z.string().trim().min(1).max(40) }).parse(req.body)
    // identity rests entirely on this name, so it must be a known colleague —
    // otherwise anyone could POST {name:'Salma'} and act as Salma. Canonical-case
    // the match so 'salma' and 'Salma' resolve to one identity.
    const match = COLLEAGUES.find((c) => c.toLowerCase() === name.toLowerCase())
    if (!match) throw badRequest('Unknown colleague — pick a name from the list')
    setUser(reply, match)
    return { user: match }
  })

  app.post('/api/auth/logout', async (_req, reply) => {
    clearUser(reply)
    return { ok: true }
  })
}
