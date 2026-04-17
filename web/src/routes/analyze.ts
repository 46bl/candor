import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { analyzePage } from '../views/analyze.js'
import { analyzeProduct } from '../lib/analyze.js'
import { resolveAccount, recordCheck } from '../lib/account.js'
import type { CustomAIOptions } from '../lib/ai/client.js'

export const analyzeRoute = new Hono()

const ACCOUNT_COOKIE = 'candor_account'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year in seconds

// GET /analyze — show form (optionally pre-filled via ?q= or account cookie)
analyzeRoute.get('/', (c) => {
  const input          = c.req.query('q') ?? ''
  const prefillAccount = getCookie(c, ACCOUNT_COOKIE) ?? ''
  return c.html(analyzePage({ input, prefillAccount }))
})

// POST /analyze — form submission
analyzeRoute.post('/', async (c) => {
  let body: Record<string, string>
  try {
    body = (await c.req.parseBody()) as Record<string, string>
  } catch {
    return c.html(analyzePage({ error: 'Could not parse form data.' }), 400)
  }

  const input          = String(body.input          ?? '').trim()
  const accountNumber  = String(body.accountNumber   ?? '').trim()
  const rememberMe     = body.rememberAccount === '1'
  const prefillAccount = getCookie(c, ACCOUNT_COOKIE) ?? ''

  if (!input || input.length < 2) {
    return c.html(analyzePage({ input, error: 'Please enter a product name or URL.', prefillAccount }))
  }
  if (input.length > 500) {
    return c.html(analyzePage({ input: input.slice(0, 500), error: 'Input too long. Max 500 characters.', prefillAccount }), 400)
  }

  // Validate account number
  const auth = await resolveAccount(accountNumber)
  if (!auth.ok) {
    return c.html(analyzePage({ input, error: auth.error, prefillAccount }), auth.status)
  }

  // Parse custom AI settings if provided
  let customAI: CustomAIOptions | undefined
  const aiProvider = String(body.ai_provider ?? '').trim().toLowerCase()
  if (aiProvider) {
    customAI = {
      provider: aiProvider,
      apiKey:   body.ai_key      ? String(body.ai_key).trim()      : undefined,
      model:    body.ai_model    ? String(body.ai_model).trim()    : undefined,
      baseUrl:  body.ai_base_url ? String(body.ai_base_url).trim() : undefined,
    }
  }

  try {
    const result = await analyzeProduct(input, customAI)
    await recordCheck(accountNumber)

    // Handle cookie preference
    // rememberMe checked → set/refresh cookie; unchecked → clear it
    if (rememberMe) {
      setCookie(c, ACCOUNT_COOKIE, accountNumber, {
        path:     '/',
        maxAge:   COOKIE_MAX_AGE,
        sameSite: 'Strict',
        httpOnly: false,          // must be readable by JS so user can clear it
        secure:   process.env.NODE_ENV === 'production',
      })
    } else if (prefillAccount) {
      // User had a cookie but unchecked "remember me" — clear it
      deleteCookie(c, ACCOUNT_COOKIE, { path: '/' })
    }

    const newPrefill = rememberMe ? accountNumber : ''
    return c.html(analyzePage({ input, result, prefillAccount: newPrefill }))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return c.html(analyzePage({ input, error: `Analysis failed: ${msg}. Please try again.`, prefillAccount }), 500)
  }
})
