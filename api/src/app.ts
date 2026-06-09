import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { env } from './env'
import { AppError } from './lib/errors'
import { authRoutes } from './routes/auth'
import { restaurantRoutes } from './routes/restaurants'
import { sessionRoutes } from './routes/sessions'
import { orderRoutes } from './routes/orders'

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { transport: undefined },
  })

  app.register(cors, { origin: env.WEB_ORIGIN, credentials: true })
  app.register(cookie, { secret: env.COOKIE_SECRET })

  app.get('/api/health', async () => ({ ok: true, ts: Date.now() }))

  app.register(authRoutes)
  app.register(restaurantRoutes)
  app.register(sessionRoutes)
  app.register(orderRoutes)

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) return reply.code(err.statusCode).send({ error: err.message })
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'Invalid request', details: err.flatten() })
    }
    reply.log.error(err)
    return reply.code(500).send({ error: 'Internal error' })
  })

  return app
}
