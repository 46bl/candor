import { layout } from './layout.js'
import { isSelfHosted } from '../lib/config.js'

const EFFECTIVE_DATE = '2026-04-16'

export function privacyPage(): string {
  const selfHosted = isSelfHosted()
  const body = `<div style="max-width:680px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">

  <div class="eyebrow">Legal</div>
  <h1 class="heading-lg">Privacy Policy</h1>
  <p style="font-family:var(--font-mono);font-size:11px;color:var(--c-secondary);margin-bottom:var(--sp-xl)">
    Effective: ${EFFECTIVE_DATE} &nbsp;&middot;&nbsp; This is the complete, unabridged list of everything we collect.
  </p>

  <div style="background:var(--c-black);color:var(--c-white);padding:var(--sp-lg);margin-bottom:var(--sp-xl)">
    <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:var(--c-secondary);margin-bottom:var(--sp-sm)">
      Summary
    </div>
    <p style="font-size:15px;line-height:1.7;color:var(--c-hint)">
      We collect almost nothing. What we do store lives in a SQLite database and contains
      no personal information whatsoever &mdash; only a one-way hash of your account number,
      your subscription tier, and a daily check counter. That&rsquo;s it.
    </p>
  </div>

  <div style="display:grid;gap:var(--sp-lg)">

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      1. What we store in our database
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-bottom:var(--sp-sm)">
      Our SQLite database contains exactly these columns per account record:
    </p>
    <div style="border:1px solid var(--c-border);font-family:var(--font-mono);font-size:12px">
      <div style="display:grid;grid-template-columns:180px 1fr;gap:0;border-bottom:1px solid var(--c-border)">
        <div style="padding:10px 12px;background:var(--c-bg);font-weight:700;border-right:1px solid var(--c-border)">Field</div>
        <div style="padding:10px 12px;background:var(--c-bg);font-weight:700">What it contains</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid var(--c-light)">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">account_hash</div>
        <div style="padding:10px 12px;color:var(--c-muted)">SHA-256 hash of your account number. One-way — we cannot reverse it to get your number.</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid var(--c-light)">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">tier</div>
        <div style="padding:10px 12px;color:var(--c-muted)">"free", "pro", or "lifetime"</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid var(--c-light)">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">created_at</div>
        <div style="padding:10px 12px;color:var(--c-muted)">Timestamp of account creation. Not linked to you in any identifiable way.</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid var(--c-light)">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">expires_at</div>
        <div style="padding:10px 12px;color:var(--c-muted)">Subscription expiry date (Pro only). NULL for lifetime/free.</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid var(--c-light)">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">daily_checks</div>
        <div style="padding:10px 12px;color:var(--c-muted)">A counter (integer). Resets each day. Does not record what you checked.</div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr">
        <div style="padding:10px 12px;border-right:1px solid var(--c-light);color:var(--c-secondary)">last_check_date</div>
        <div style="padding:10px 12px;color:var(--c-muted)">Date of last check in YYYY-MM-DD format, used only to reset the counter above.</div>
      </div>
    </div>
    <p style="font-size:13px;color:var(--c-muted);line-height:1.65;margin-top:var(--sp-sm)">
      There is no "search history" column. We do not know what products you have checked.
      We store that you made <em>N</em> checks today, not <em>what</em> those checks were.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      2. What we do NOT store
    </h2>
    <ul style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px">
      <li>Your IP address (not logged, not stored, not used beyond in-memory rate limiting on account creation &mdash; see Section 6)</li>
      <li>Your email address (we don&rsquo;t ask for one)</li>
      <li>Your name, location, or any personal identifier</li>
      <li>Which products you have searched</li>
      <li>Browser fingerprint or User-Agent string</li>
      <li>Referrer URLs</li>
      <li>Session identifiers (beyond the optional account cookie &mdash; see Section 4)</li>
      <li>Analytics events of any kind</li>
      <li>Custom API keys you provide via Advanced Settings (used in-memory, discarded immediately)</li>
    </ul>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      3. What happens during an analysis request
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      When you submit a product for analysis, the following happens entirely in memory
      and is discarded when the request completes:
    </p>
    <ol style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px;margin-top:8px">
      <li>Your account number hash is checked against the database (rate limit check).</li>
      <li>Your product URL or name is sent to Amazon, Reddit, Trustpilot, and a web search endpoint to gather review data.</li>
      <li>The review data is assembled into a prompt and sent to an AI provider (configured by you or by default).</li>
      <li>The AI returns a structured analysis. The analysis is sent to you.</li>
      <li>Everything &mdash; the product input, raw review data, AI prompt, and response &mdash; is discarded. Nothing is written to disk.</li>
    </ol>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      The only database write during an analysis is incrementing the <code>daily_checks</code> counter.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      4. The optional account cookie
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      If you opt in (via the &ldquo;Remember my account number&rdquo; checkbox on the analyze page),
      we set a browser cookie named <code>candor_account</code> containing your account number.
      This cookie:
    </p>
    <ul style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px;margin-top:8px">
      <li>Is set with <code>SameSite=Strict</code> — not sent on cross-site requests</li>
      <li>Is set with <code>HttpOnly=false</code> — readable by the page so you can clear it</li>
      <li>Is set with <code>Secure</code> in production — HTTPS only</li>
      <li>Expires in 1 year</li>
      <li>Contains only your account number (a random 16-digit number — no PII)</li>
      <li>Is not sent to or read by any third party</li>
      <li>Can be cleared at any time from the analyze page or via your browser settings</li>
    </ul>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      If you do not opt in, no cookie is set. The default is no cookie.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      5. Third-party services
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-bottom:var(--sp-sm)">
      During an analysis, we make outbound requests to:
    </p>
    <ul style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px">
      <li><strong>Amazon, Reddit, Trustpilot</strong> — to fetch publicly available review data. These sites may log our server&rsquo;s IP. Your IP is never forwarded.</li>
      <li><strong>AI provider</strong> (OpenAI, Anthropic, Groq, or your custom endpoint) — receives the assembled prompt only. No account information is sent. Responses are discarded immediately.</li>
      ${!selfHosted ? `<li><strong>Stripe</strong> — handles payment processing for Pro and Lifetime subscriptions. Stripe stores your payment details under their own privacy policy. We pass only a hash of your account number to Stripe as metadata &mdash; never the account number itself, and never your name or email.</li>` : ''}
    </ul>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      We use no advertising networks, analytics platforms, CDNs that fingerprint users, or social login providers.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      6. Account creation rate limiting
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      To prevent automated mass-creation of free accounts, we apply a rate limit during
      account creation based on your IP address. Specifically:
    </p>
    <ul style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px;margin-top:8px">
      <li>Your IP address is checked against an in-memory counter when you request a new account.</li>
      <li>This counter lives in server RAM only and is never written to disk.</li>
      <li>It resets automatically every 24 hours.</li>
      <li>It is not linked to your account record in any way.</li>
      <li>When the server restarts, all rate-limit state is lost.</li>
    </ul>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      Your IP is never stored, logged, or associated with your account number. It is used only as a temporary
      in-memory key to enforce the creation limit, then discarded.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      7. Your rights
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      Because we hold no personal data linked to you, traditional data rights (access, correction,
      deletion) are trivially satisfied &mdash; there is nothing to access, correct, or delete beyond
      your account record (which contains no personal information).
      To delete your account record entirely, contact us with your account number.
      We will delete the SHA-256 hash from our database.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      8. Changes to this policy
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      If we ever begin collecting more data than described here, we will update this page,
      update the effective date, and announce it prominently on the website.
      We will not introduce tracking, analytics, or behavioral profiling.
      That is a product commitment, not just a legal one.
    </p>
  </section>

  </div>

  <div style="margin-top:var(--sp-xl);padding-top:var(--sp-lg);border-top:1px solid var(--c-border);display:flex;gap:var(--sp-md)">
    <a href="/terms"   style="font-size:13px;color:var(--c-black)">Terms of Service</a>
    <a href="/account" style="font-size:13px;color:var(--c-black)">Account</a>
  </div>
</div>`

  return layout('Privacy Policy', body)
}
