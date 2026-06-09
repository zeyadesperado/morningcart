import { buildApp } from './app'
import { env } from './env'

const app = buildApp()

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then((addr) => app.log.info(`MorningCart API listening on ${addr}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
