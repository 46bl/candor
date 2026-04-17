import { layout } from './layout.js'
import { isSelfHosted } from '../lib/config.js'

const EFFECTIVE_DATE = '2026-04-16'
const COMPANY = 'CANDOR'

export function termsPage(): string {
  const selfHosted = isSelfHosted()
  const body = `<div style="max-width:680px;margin:0 auto;padding:var(--sp-xl) var(--sp-lg)">

  <div class="eyebrow">Legal</div>
  <h1 class="heading-lg">Terms of Service</h1>
  <p style="font-family:var(--font-mono);font-size:11px;color:var(--c-secondary);margin-bottom:var(--sp-xl)">
    Effective: ${EFFECTIVE_DATE} &nbsp;&middot;&nbsp; Plain language, honest terms.
  </p>

  <div style="display:grid;gap:var(--sp-lg)">

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      1. Acceptance
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      By using ${COMPANY} (the &ldquo;Service&rdquo;), including the web application, browser extension,
      or API, you agree to these Terms. If you do not agree, do not use the Service.
      Use of the Service constitutes acceptance of the most current version of these Terms.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      2. Description of Service
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      ${COMPANY} aggregates publicly available product review data from third-party sources
      (including but not limited to Amazon, Reddit, and Trustpilot), analyzes it using AI,
      and returns a summary. We do not guarantee the accuracy, completeness, or timeliness of
      any analysis. Results are informational only. We are not responsible for purchasing
      decisions made based on ${COMPANY} output.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      3. Accounts
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      Access to the Service requires an account number. Account numbers are randomly generated
      and are not linked to any personally identifiable information. We store only a
      cryptographic hash (SHA-256) of your account number. The account number itself
      is shown to you exactly once at creation and is never stored by us in recoverable form.
      <strong>If you lose your account number, it cannot be recovered.</strong> You are solely
      responsible for keeping your account number secure. You may not share, sell, or transfer
      your account number to others.
    </p>
  </section>

  ${!selfHosted ? `<section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      4. Subscriptions and Payments
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      <strong>Free tier:</strong> 5 checks per day. No payment required.<br><br>
      <strong>Pro (monthly / annual):</strong> Billed via Stripe on a recurring basis. You may cancel
      at any time; your Pro access continues until the end of the paid billing period.
      No refunds are issued for partial billing periods.<br><br>
      <strong>Lifetime:</strong> A one-time payment grants unlimited access for the operational lifetime
      of the Service. See Section 5 for what &ldquo;lifetime&rdquo; means and your rights if the Service
      is discontinued.<br><br>
      We reserve the right to change prices with 30 days&rsquo; notice communicated via the website.
      Existing subscriptions are honored at the rate they were purchased until renewal.
    </p>
  </section>

  <section style="border:2px solid var(--c-black);padding:var(--sp-lg)">
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      5. Service Continuity and Shutdown
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      &ldquo;Lifetime&rdquo; means the operational lifetime of the ${COMPANY} service, not the
      customer&rsquo;s personal lifetime. We are an independent service and cannot guarantee
      indefinite operation.
    </p>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      <strong>If we discontinue the Service, we will:</strong>
    </p>
    <ul style="font-size:14px;color:var(--c-muted);line-height:1.85;margin-left:20px;margin-top:8px">
      <li>Provide at least <strong>60 days&rsquo; written notice</strong> via the website before shutdown.</li>
      <li>Issue a <strong>prorated refund</strong> to Lifetime account holders based on the following schedule:
        <ul style="margin-top:6px;margin-left:20px">
          <li>Shutdown within 12 months of Lifetime purchase: 75% refund</li>
          <li>Shutdown within 12&ndash;24 months of Lifetime purchase: 50% refund</li>
          <li>Shutdown within 24&ndash;36 months of Lifetime purchase: 25% refund</li>
          <li>Shutdown after 36 months of Lifetime purchase: No refund obligation</li>
        </ul>
      </li>
      <li>Issue a <strong>prorated refund</strong> for unused days of annual Pro subscriptions.</li>
      <li>Monthly Pro subscriptions: no refund obligation beyond the current billing month.</li>
    </ul>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      Refunds require you to identify your account number at time of claim. Because we cannot
      recover your account number from our records, you must provide it to claim a refund.
      Refunds are processed to the original payment method on file with Stripe.
    </p>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75;margin-top:var(--sp-sm)">
      We reserve the right to suspend or shut down the Service at any time in response to
      legal obligations, financial insolvency, or circumstances beyond our reasonable control,
      with or without notice. In such cases, we will make reasonable efforts to provide refunds
      but cannot guarantee them.
    </p>
  </section>` : ''}

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      6. Acceptable Use
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      You may not use the Service to: (a) violate any applicable law; (b) systematically
      scrape or harvest results beyond your account&rsquo;s rate limit; (c) reverse-engineer or
      attempt to extract the underlying prompts, models, or scraping logic; (d) resell access
      to the Service without authorization; (e) circumvent rate limiting by creating multiple
      accounts. We reserve the right to terminate accounts that violate these terms without
      refund.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      7. Custom API Keys
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      If you provide your own AI provider API key via Advanced Settings, that key is transmitted
      to our servers over encrypted HTTPS, used in memory to fulfill your analysis request, and
      immediately discarded. It is never logged, stored, or used for any other purpose. We are not
      responsible for any charges you incur with your AI provider as a result of using custom keys.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      8. Disclaimer of Warranties
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTY OF ANY KIND,
      EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
      PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
      UNINTERRUPTED, ERROR-FREE, OR THAT RESULTS WILL BE ACCURATE OR COMPLETE. REVIEW ANALYSIS IS
      GENERATED BY AI AND MAY CONTAIN ERRORS, OMISSIONS, OR BIASES.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      9. Limitation of Liability
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ${COMPANY} AND ITS OPERATORS SHALL
      NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
      INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE OR
      ANY PRODUCT PURCHASED IN RELIANCE ON SERVICE OUTPUT. OUR TOTAL LIABILITY SHALL NOT EXCEED
      THE AMOUNT YOU PAID TO US IN THE THREE MONTHS PRECEDING THE CLAIM.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      10. Privacy
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      Our privacy practices are described at <a href="/privacy" style="color:var(--c-black)">/privacy</a>
      and in-line throughout the product. In summary: we collect no personal data. We store only
      cryptographic hashes of account numbers, subscription tier, and daily check counters in SQLite.
      No IP addresses, browsing history, or product search history is retained.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      11. Changes to These Terms
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      We may update these Terms at any time. Continued use of the Service after changes constitutes
      acceptance. Material changes that affect Lifetime or Pro subscribers (particularly regarding
      Section 5) will be announced via the website with at least 30 days&rsquo; notice.
    </p>
  </section>

  <section>
    <h2 style="font-size:15px;font-weight:700;margin-bottom:var(--sp-sm);padding-bottom:8px;border-bottom:1px solid var(--c-border)">
      12. Contact
    </h2>
    <p style="font-size:14px;color:var(--c-muted);line-height:1.75">
      Questions about these Terms? Refund requests? Contact us at the address listed on our website.
      Because accounts have no email association, refund requests require you to provide your account
      number and original payment reference from Stripe.
    </p>
  </section>

  </div>

  <div style="margin-top:var(--sp-xl);padding-top:var(--sp-lg);border-top:1px solid var(--c-border)">
    <p style="font-family:var(--font-mono);font-size:11px;color:var(--c-secondary)">
      These Terms are written in plain English. Where plain English conflicts with legal interpretation,
      the intent expressed plainly is the intent we mean. We are not a large corporation with a legal
      team — we are a small, independent service trying to do the right thing.
    </p>
  </div>
</div>`

  return layout('Terms of Service', body)
}
