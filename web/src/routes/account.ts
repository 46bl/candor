// /account/* routes — Mullvad-style account number management
// No email. No name. No password. Just a number.

import { Hono } from 'hono'
import { createNewAccount, isValidAccountNumberFormat, hashAccountNumber } from '../lib/account.js'
import { getAccountByHash, upgradeAccount } from '../lib/db.js'
import { checkAccountCreationLimit, extractIP } from '../lib/ratelimit.js'
import { layout, escHtml } from '../views/layout.js'

export const accountRoute = new Hono()

// GET /account/new — generate and return a new account number
// Rate-limited by IP (in-memory only, never stored). See /privacy for details.
// The number is shown exactly once. We cannot show it again.
accountRoute.get('/new', async (c) => {
  // Check in-memory creation rate limit — IP never written to disk
  const ip = extractIP(c.req.raw)
  const limit = checkAccountCreationLimit(ip)
  if (!limit.allowed) {
    return c.html(layout('Rate Limited', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
      <div class="error-box">
        <strong>Too many accounts created from this connection.</strong><br><br>
        You can create up to 5 free accounts per day. If you need more, contact us.
        Your IP address is not stored &mdash; this limit resets after 24 hours.<br><br>
        <a href="/account">Check an existing account &rarr;</a>
      </div>
    </div>`), 429)
  }

  const account = await createNewAccount()

  const body = `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
  <div class="eyebrow">Account created</div>
  <h1 class="heading-lg">Your account number</h1>

  <div style="background:var(--c-black);color:var(--c-white);padding:var(--sp-lg);margin:var(--sp-lg) 0;font-family:var(--font-mono)">
    <div style="font-size:10px;letter-spacing:0.15em;color:var(--c-secondary);margin-bottom:12px;text-transform:uppercase">
      Account number — save this now
    </div>
    <div id="account-num" style="font-size:28px;font-weight:800;letter-spacing:0.08em;word-spacing:8px">
      ${escHtml(account.accountNumber)}
    </div>
    <div style="margin-top:16px;font-size:11px;color:var(--c-hint)">
      Tier: FREE &nbsp;&middot;&nbsp; 5 checks/day
    </div>
  </div>

  <div style="border:2px solid var(--c-black);padding:var(--sp-md);margin-bottom:var(--sp-lg)">
    <strong style="font-family:var(--font-mono);font-size:12px">&#9888; This number will not be shown again.</strong>
    <p style="font-size:13px;color:var(--c-muted);margin-top:8px;line-height:1.6">
      We store only a cryptographic hash of this number — not the number itself.
      If you lose it, it cannot be recovered. Write it down or save it in a password manager.
    </p>
  </div>

  <div style="display:grid;gap:8px;margin-bottom:var(--sp-lg)">
    <button onclick="copyAccount()" class="btn btn-outline" style="justify-content:center">Copy number</button>
    <a href="/analyze" class="btn btn-primary" style="justify-content:center">Start checking products &rarr;</a>
  </div>

  <div style="font-size:13px;color:var(--c-muted);line-height:1.7">
    <strong>How to use it:</strong><br>
    Enter your account number on the analyze page or in the extension settings.
    It acts as your subscription key — no email or password required.
    To upgrade to Pro, visit <a href="/upgrade" style="color:var(--c-black)">/upgrade</a> and enter this number.
  </div>
</div>

<script>
function copyAccount() {
  navigator.clipboard.writeText('${escHtml(account.accountNumber)}')
    .then(function() {
      var btn = document.querySelector('button');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Copy number'; }, 2000); }
    });
}
</script>`

  return c.html(layout('Your Account Number', body, { noindex: true }))
})

// GET /account — account status page
accountRoute.get('/', (c) => {
  const body = `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
  <div class="eyebrow">Account</div>
  <h1 class="heading-lg">Account numbers</h1>
  <p class="body-copy">CANDOR accounts work like Mullvad VPN: a random number is your account. No email. No name. No password.</p>

  <div style="display:grid;gap:var(--sp-sm);margin-top:var(--sp-lg)">
    <a href="/account/new" class="btn btn-primary">Get a free account number &rarr;</a>
    <a href="/upgrade"     class="btn btn-outline">Upgrade existing account</a>
  </div>

  <div style="margin-top:var(--sp-xl)">
    <h2 style="font-size:16px;font-weight:600;margin-bottom:var(--sp-md)">Check account status</h2>
    <form method="POST" action="/account/status" id="check-form">
      <div class="analyze-form">
        <input class="analyze-input" type="text" name="number"
          placeholder="XXXX-XXXX-XXXX-XXXX" pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}"
          style="font-size:16px;letter-spacing:0.08em" autocomplete="off" spellcheck="false">
        <button class="btn btn-primary" type="submit">Check</button>
      </div>
    </form>
  </div>

  <div style="margin-top:var(--sp-xl);font-size:13px;color:var(--c-muted);line-height:1.75">
    <strong>Privacy model:</strong> We store only a cryptographic hash (SHA-256) of your account number.
    We cannot reverse it to identify you. If you lose your number, we cannot recover it — there is no email to reset to.
    This is by design.
  </div>
</div>`

  return c.html(layout('Account', body))
})

// POST /account/status — check tier of an existing account number
accountRoute.post('/status', async (c) => {
  const body = await c.req.parseBody() as { number?: string }
  const input = String(body.number ?? '').trim()

  if (!isValidAccountNumberFormat(input)) {
    return c.html(layout('Account Status', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
      <div class="error-box">Invalid account number format. Expected: XXXX-XXXX-XXXX-XXXX</div>
      <a href="/account" class="btn btn-outline mt-md">&larr; Back</a>
    </div>`))
  }

  const hash = await hashAccountNumber(input)
  const account = getAccountByHash(hash)

  if (!account) {
    return c.html(layout('Account Status', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
      <div class="error-box">Account number not found.</div>
      <a href="/account/new" class="btn btn-primary mt-md">Get a free account &rarr;</a>
    </div>`))
  }

  const isExpired = account.tier === 'pro' && account.expires_at
    ? new Date(account.expires_at) < new Date()
    : false

  const tierLabel = isExpired ? 'PRO (expired)' : account.tier.toUpperCase()
  const expiryText = account.expires_at
    ? `Expires: ${new Date(account.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
    : account.tier === 'lifetime' ? 'Never expires' : ''

  return c.html(layout('Account Status', `<div style="max-width:640px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">
  <div class="eyebrow">Account status</div>
  <h1 class="heading-lg">Your account</h1>
  <div style="border:1px solid var(--c-border);background:var(--c-white);padding:var(--sp-lg);margin:var(--sp-md) 0">
    <div style="font-family:var(--font-mono);font-size:11px;color:var(--c-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em">Tier</div>
    <div style="font-size:24px;font-weight:800;font-family:var(--font-mono)">${escHtml(tierLabel)}</div>
    ${expiryText ? `<div style="font-size:13px;color:var(--c-muted);margin-top:8px">${escHtml(expiryText)}</div>` : ''}
  </div>
  <div style="display:grid;gap:8px;margin-top:var(--sp-lg)">
    ${account.tier === 'free' || isExpired
      ? `<a href="/upgrade" class="btn btn-primary">Upgrade to Pro &rarr;</a>`
      : `<a href="/analyze" class="btn btn-primary">Check a product &rarr;</a>`
    }
    <a href="/account" class="btn btn-outline">&larr; Back</a>
  </div>
</div>`))
})
