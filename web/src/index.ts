// CANDOR — Bun + Hono server
// Privacy-first: no logging middleware, no cookies, no analytics.
// Security headers applied globally.

import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { indexRoute } from './routes/index.js'
import { analyzeRoute } from './routes/analyze.js'
import { accountRoute } from './routes/account.js'
import { upgradeRoute } from './routes/upgrade.js'
import { termsRoute } from './routes/terms.js'
import { analyzeApi } from './api/analyze.js'
import { privacyRoute } from './routes/privacy.js'

const app = new Hono()

// ── Global security + privacy headers ────────────────────────────────────────
app.use('*', async (c, next) => {
  await next()
  if (c.req.path.startsWith('/api/')) {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  }
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('X-XSS-Protection', '1; mode=block')
  c.header('Referrer-Policy', 'no-referrer')
  c.header('Permissions-Policy', 'interest-cohort=()')
  c.header(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  )
})

// ── Static assets ─────────────────────────────────────────────────────────────
app.use('/public/*', serveStatic({ root: './' }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.route('/', indexRoute)
app.route('/analyze', analyzeRoute)
app.route('/account', accountRoute)
app.route('/upgrade', upgradeRoute)
app.route('/terms', termsRoute)
app.route('/privacy', privacyRoute)
app.route('/api', analyzeApi)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.notFound((c) =>
  c.html(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>404 — CANDOR</title>
    <style>body{font-family:monospace;padding:48px;background:#F5F5F5;color:#0A0A0A}a{color:#0A0A0A}</style>
    </head><body><h1>404</h1><p><a href="/">Return home</a></p></body></html>`,
    404
  )
)

// ── Start ─────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT) || 3000
console.log(`[ C ] CANDOR  →  http://localhost:${port}`)
console.log(`      Provider:  ${process.env.AI_PROVIDER ?? 'openai'}`)
console.log(`      Mock:      ${process.env.USE_MOCK === 'true' ? 'yes' : 'no'}`)
console.log(`      DB:        ${process.env.DB_PATH ?? 'candor.db (default)'}`)

export default { port, fetch: app.fetch }
