import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// Dependency-free .env loader (Docker injects env directly, so .env is optional).
const here = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(here, '../.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][\w.]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    if (m[1] in process.env) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[m[1]] = v
  }
}

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 chars'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  NODE_ENV: z.string().default('development'),
  OFFICE_TZ: z.string().default('Africa/Cairo'),
})

export const env = schema.parse(process.env)
