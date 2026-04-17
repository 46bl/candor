// /upgrade — pricing and subscription upgrade page
// Stripe integration is stubbed — configure STRIPE_* env vars to activate.
// In SELF_HOSTED=true mode, this route returns 404 — there are no tiers.

import { Hono } from 'hono'
import { layout, escHtml } from '../views/layout.js'
import { isValidAccountNumberFormat, hashAccountNumber } from '../lib/account.js'
import { getAccountByHash, upgradeAccount } from '../lib/db.js'
import { isSelfHosted } from '../lib/config.js'

export const upgradeRoute = new Hono()

// Self-hosted guard — applies to all /upgrade sub-paths
upgradeRoute.use('*', async (c, next) => {
  if (isSelfHosted()) {
    return c.html(layout('Not Found', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
      <div class="eyebrow">404</div>
      <h1 class="heading-lg">Page not found</h1>
      <p class="body-copy">This installation runs in self-hosted mode. There are no tiers or subscriptions &mdash; all checks are unlimited.</p>
      <a href="/analyze" class="btn btn-primary mt-md">Check a product &rarr;</a>
    </div>`), 404)
  }
  await next()
})

upgradeRoute.get('/', (c) => {
  const prefill = c.req.query('account') ?? ''
  return c.html(renderUpgradePage(prefill))
})

upgradeRoute.post('/', async (c) => {
  const body = await c.req.parseBody() as { account?: string; plan?: string }
  const accountNum = String(body.account ?? '').trim()
  const plan = String(body.plan ?? '')

  if (!isValidAccountNumberFormat(accountNum)) {
    return c.html(renderUpgradePage(accountNum, 'Invalid account number format.'))
  }

  const hash = await hashAccountNumber(accountNum)
  const account = getAccountByHash(hash)

  if (!account) {
    return c.html(renderUpgradePage(accountNum, 'Account number not found. Get a free account first.'))
  }

  if (!['pro_monthly', 'pro_annual', 'lifetime'].includes(plan)) {
    return c.html(renderUpgradePage(accountNum, 'Please select a plan.'))
  }

  // ── Stripe redirect (stub) ──────────────────────────────────────────────────
  // In production: create a Stripe Checkout session, redirect to session.url
  // The account hash is stored as Stripe metadata — no PII, just the hash.
  // Webhook at /api/webhook/stripe handles completion.
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    // Dev mode: auto-upgrade for testing (remove in production)
    if (process.env.NODE_ENV !== 'production') {
      const tier = plan === 'lifetime' ? 'lifetime' : 'pro'
      const expiresAt = plan === 'pro_monthly'
        ? new Date(Date.now() + 30 * 86_400_000).toISOString()
        : plan === 'pro_annual'
        ? new Date(Date.now() + 365 * 86_400_000).toISOString()
        : null
      upgradeAccount(hash, tier, expiresAt)
      return c.html(layout('Upgraded', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
        <div class="eyebrow">Development mode</div>
        <h1 class="heading-lg">Account upgraded (dev)</h1>
        <p class="body-copy">Stripe is not configured. Account upgraded to <strong>${tier}</strong> for testing.</p>
        <a href="/analyze" class="btn btn-primary mt-lg">Start checking &rarr;</a>
      </div>`))
    }
    return c.html(renderUpgradePage(accountNum, 'Payment processing is not yet configured. Contact support.'))
  }

  // TODO: Create Stripe session and redirect
  // const session = await stripe.checkout.sessions.create({ ... })
  // return c.redirect(session.url)
  return c.html(renderUpgradePage(accountNum, 'Stripe integration pending.'))
})

function renderUpgradePage(prefillAccount = '', error = ''): string {
  const body = `<div style="max-width:700px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
  <div class="eyebrow">Upgrade</div>
  <h1 class="heading-lg">Choose your plan</h1>

  ${error ? `<div class="error-box" style="margin-bottom:var(--sp-md)">${escHtml(error)}</div>` : ''}

  <div class="pricing-grid" style="margin-bottom:var(--sp-xl)">
    <div class="price-card">
      <div class="price-tier">Free</div>
      <div class="price-amount">$0</div>
      <div class="price-desc mt-sm">5 checks per day. Account number required.</div>
    </div>
    <div class="price-card featured">
      <div class="price-tier">Pro Monthly</div>
      <div class="price-amount">$7<span class="price-period">/mo</span></div>
      <div class="price-desc mt-sm">Unlimited checks. Extension included. Cancel anytime.</div>
    </div>
    <div class="price-card featured" style="position:relative">
      <div class="price-tier">Pro Annual</div>
      <div class="price-amount">$55<span class="price-period">/yr</span></div>
      <div class="price-desc mt-sm">Same as monthly, 35% off. Best value ongoing plan.</div>
    </div>
    <div class="price-card">
      <div class="price-tier">Founding Supporter</div>
      <div class="price-amount">$89</div>
      <div class="price-desc mt-sm">One-time. Unlimited forever. First 200 only &mdash; subject to continuity terms.</div>
    </div>
  </div>

  <h2 style="font-size:16px;font-weight:600;margin-bottom:var(--sp-md)">Enter your account number to upgrade</h2>
  <p style="font-size:13px;color:var(--c-muted);margin-bottom:var(--sp-md)">
    No email. No name. Just your account number. Payment is processed by Stripe.
    We pass only a hash of your account number to Stripe &mdash; never the number itself.
  </p>

  <form method="POST" action="/upgrade">
    <div style="margin-bottom:var(--sp-md)">
      <input class="analyze-input" type="text" name="account"
        value="${escHtml(prefillAccount)}"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}"
        style="font-size:16px;letter-spacing:0.08em;width:100%"
        autocomplete="off" spellcheck="false" required>
    </div>
    <div style="display:grid;gap:var(--sp-sm);margin-bottom:var(--sp-md)">
      <label style="display:flex;align-items:center;gap:10px;padding:var(--sp-md);border:1px solid var(--c-border);cursor:pointer;font-size:13px">
        <input type="radio" name="plan" value="pro_monthly" style="accent-color:#0A0A0A"> Pro Monthly &mdash; $7/month
      </label>
      <label style="display:flex;align-items:center;gap:10px;padding:var(--sp-md);border:1px solid var(--c-border);cursor:pointer;font-size:13px">
        <input type="radio" name="plan" value="pro_annual" style="accent-color:#0A0A0A"> Pro Annual &mdash; $55/year (35% off)
      </label>
      <label style="display:flex;align-items:center;gap:10px;padding:var(--sp-md);border:2px solid var(--c-black);cursor:pointer;font-size:13px">
        <input type="radio" name="plan" value="lifetime" style="accent-color:#0A0A0A"> Founding Supporter &mdash; $89 one-time (first 200 only)
      </label>
    </div>
    <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">
      Continue to payment &rarr;
    </button>
  </form>

  <p style="font-size:11px;color:var(--c-hint);font-family:var(--font-mono);margin-top:var(--sp-md);line-height:1.7">
    Payments processed by Stripe. We never see or store your card details.
    Lifetime plan is subject to our <a href="/terms" style="color:var(--c-secondary)">Terms of Service</a>.
    No refunds on Pro after the billing period starts.
  </p>

  <p style="font-size:13px;color:var(--c-muted);margin-top:var(--sp-lg)">
    Don't have an account number yet?
    <a href="/account/new" style="color:var(--c-black);font-weight:600">Get one free &rarr;</a>
  </p>
</div>`

  return layout('Upgrade', body)
}
