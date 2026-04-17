// POST /api/analyze — stateless JSON endpoint
// Validates account number, checks tier/rate-limit, runs analysis.
// Accepts optional user-provided AI settings (used in-memory, never stored).
// No logs. No persistence beyond the account check counter in SQLite.

import { Hono } from 'hono'
import { analyzeProduct } from '../lib/analyze.js'
import { resolveAccount, recordCheck } from '../lib/account.js'
import { isSelfHosted } from '../lib/config.js'
import type { CustomAIOptions } from '../lib/ai/client.js'

export const analyzeApi = new Hono()

analyzeApi.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  c.header('Pragma', 'no-cache')
})

analyzeApi.post('/analyze', async (c) => {
  let body: {
    input?: unknown
    accountNumber?: unknown
    customAI?: {
      provider?: unknown
      apiKey?: unknown
      model?: unknown
      baseUrl?: unknown
    }
  }

  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Request body must be valid JSON.' }, 400)
  }

  const input         = String(body.input ?? '').trim()
  const accountNumber = String(body.accountNumber ?? '').trim()

  // ── Validate input ──────────────────────────────────────────────────────────
  if (!input || input.length < 2) {
    return c.json({ error: 'Field "input" is required (product name or URL).' }, 400)
  }
  if (input.length > 500) {
    return c.json({ error: 'Field "input" must be 500 characters or fewer.' }, 400)
  }

  // ── Validate account number (skipped in self-hosted mode) ──────────────────
  const auth = await resolveAccount(isSelfHosted() ? undefined : accountNumber)
  if (!auth.ok) {
    return c.json({ error: auth.error }, auth.status)
  }

  // ── Parse optional custom AI settings ──────────────────────────────────────
  // User-provided keys are used in-memory for this request only, then discarded.
  // They are never logged or stored. Clearly disclosed in Advanced Settings UI.
  let customAI: CustomAIOptions | undefined
  if (body.customAI && typeof body.customAI === 'object') {
    const raw = body.customAI
    const provider = String(raw.provider ?? '').trim().toLowerCase()
    if (['openai', 'anthropic', 'ollama', 'lmstudio', 'custom'].includes(provider)) {
      customAI = {
        provider,
        apiKey:  raw.apiKey  ? String(raw.apiKey).trim()  : undefined,
        model:   raw.model   ? String(raw.model).trim()   : undefined,
        baseUrl: raw.baseUrl ? String(raw.baseUrl).trim() : undefined,
      }
    }
  }

  // ── Run analysis ────────────────────────────────────────────────────────────
  try {
    const result = await analyzeProduct(input, customAI)

    // Record the check against the account's daily counter (no-op in self-hosted)
    await recordCheck(accountNumber)

    return c.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Analysis failed'
    return c.json({ error: msg }, 500)
  }
})

// Health check — no account required
analyzeApi.get('/health', (c) =>
  c.json({ status: 'ok', privacy: 'no-data-stored' })
)

// Stripe webhook — update account tier after successful payment
// Stub: configure STRIPE_WEBHOOK_SECRET and implement full verification
analyzeApi.post('/webhook/stripe', async (c) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return c.json({ error: 'Webhook not configured' }, 501)
  }

  // TODO: Verify Stripe signature, extract account_hash from metadata,
  // call upgradeAccount(hash, tier, expiresAt)
  return c.json({ received: true })
})
