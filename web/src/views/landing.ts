import { layout } from './layout.js'

export function landingPage(): string {
  const body = `

<div class="hero">
  <div class="eyebrow">Privacy-first review aggregator</div>
  <h1 class="heading-xl">Know before<br>you buy.</h1>
  <p class="hero-sub">We check Amazon, Reddit, Trustpilot, and across the web &mdash; summarize what&rsquo;s real, flag what&rsquo;s fake, then delete everything.</p>
  <div class="hero-cta-row">
    <a href="/account/new" class="btn btn-primary">Get a free account &rarr;</a>
    <a href="/analyze"     class="btn btn-outline">Check a product</a>
    <span class="hero-meta">No email &middot; No tracking &middot; Results in &lt;15s</span>
  </div>
</div>

<div class="section" style="background:var(--c-white)">
  <div class="section-inner">
    <div class="eyebrow">The problem</div>
    <h2 class="heading-lg">Reviews are broken.</h2>
    <p class="body-copy">Amazon has fake review farms. Trustpilot ratings are purchased. Influencers get paid. Star counts are gamed. You can&rsquo;t trust ratings anymore &mdash; and every existing tool that claims to help is profiling you while they do it.</p>
    <p class="body-copy mt-md">Candor cuts through it. We pull from multiple independent sources, analyze everything with AI, give you one clear read, then delete everything. We are not in the data business.</p>
  </div>
</div>

<div class="section">
  <div class="section-inner">
    <div class="eyebrow">How it works</div>
    <h2 class="heading-lg">Four steps. No email.</h2>
    <div class="steps">
      <div class="step">
        <span class="step-num">01</span>
        <span class="step-text"><strong>Get a free account number.</strong> No email. No name. Just a randomly generated 16-digit number that is your subscription key. Save it — we can&rsquo;t recover it if lost.</span>
      </div>
      <div class="step">
        <span class="step-num">02</span>
        <span class="step-text"><strong>Paste a product URL or type its name.</strong> Amazon link, Etsy listing, product name &mdash; anything works.</span>
      </div>
      <div class="step">
        <span class="step-num">03</span>
        <span class="step-text"><strong>We check four source types simultaneously.</strong> Reddit discussions, Amazon review patterns, Trustpilot company signals, and editorial articles from across the web.</span>
      </div>
      <div class="step">
        <span class="step-num">04</span>
        <span class="step-text"><strong>You get a clear verdict.</strong> Score, pros, cons, and red flags. We immediately discard everything. Zero persistence beyond your subscription record.</span>
      </div>
    </div>
  </div>
</div>

<div class="privacy-block">
  <div class="section-inner">
    <div class="eyebrow" style="color:var(--c-secondary)">Privacy model</div>
    <h2 class="heading-lg" style="color:var(--c-white)">We don&rsquo;t track you.<br>Full stop.</h2>
    <p class="body-copy">This is not a privacy policy full of asterisks. This is how the product works, technically. Your query exists only in memory for the duration of the request. When the request ends, everything is gone. The only thing we store in our database is a cryptographic hash of your account number, your subscription tier, and a daily check counter.</p>
    <div class="privacy-grid">
      <div class="privacy-cell">
        <div class="privacy-cell-label">Cookies set</div>
        <div class="privacy-cell-value">Zero</div>
      </div>
      <div class="privacy-cell">
        <div class="privacy-cell-label">IPs logged</div>
        <div class="privacy-cell-value">Never</div>
      </div>
      <div class="privacy-cell">
        <div class="privacy-cell-label">Search history</div>
        <div class="privacy-cell-value">Not stored</div>
      </div>
      <div class="privacy-cell">
        <div class="privacy-cell-label">Analytics</div>
        <div class="privacy-cell-value">None, ever</div>
      </div>
      <div class="privacy-cell">
        <div class="privacy-cell-label">Email required</div>
        <div class="privacy-cell-value">No</div>
      </div>
      <div class="privacy-cell">
        <div class="privacy-cell-label">Data sold</div>
        <div class="privacy-cell-value">Never possible</div>
      </div>
    </div>
  </div>
</div>

<div class="section" style="background:var(--c-white)">
  <div class="section-inner">
    <div class="eyebrow">Pricing</div>
    <h2 class="heading-lg">Simple. No tricks.</h2>
    <div class="pricing-grid">
      <div class="price-card">
        <div class="price-tier">Free</div>
        <div class="price-amount">$0</div>
        <div class="price-desc mt-sm">5 checks per day. Free account number required. No email, ever.</div>
      </div>
      <div class="price-card featured">
        <div class="price-tier">Pro Monthly</div>
        <div class="price-amount">$7<span class="price-period">/mo</span></div>
        <div class="price-desc mt-sm">Unlimited checks. Browser extension. Cancel any time.</div>
      </div>
      <div class="price-card featured">
        <div class="price-tier">Pro Annual</div>
        <div class="price-amount">$55<span class="price-period">/yr</span></div>
        <div class="price-desc mt-sm">Same as monthly, 35% off. Best value for regular users.</div>
      </div>
      <div class="price-card">
        <div class="price-tier">Founding Supporter</div>
        <div class="price-amount">$89</div>
        <div class="price-desc mt-sm">One-time. Unlimited forever. First 200 only &mdash; subject to <a href="/terms#5" style="color:var(--c-black)">continuity terms</a>.</div>
      </div>
    </div>
    <p class="mono color-muted mt-md">Revenue source: subscriptions only. We make money from access, never from your data.</p>
  </div>
</div>

<div class="section">
  <div class="section-inner">
    <div class="eyebrow">FAQ</div>
    <h2 class="heading-lg">Honest answers.</h2>
    <div class="faq">

      <div class="faq-item">
        <div class="faq-q">Do I need an account?</div>
        <div class="faq-a">Yes &mdash; but not in the traditional sense. You get a randomly generated 16-digit account number. No email, no name, no password. The number is your subscription. Save it like a password &mdash; we cannot recover it if you lose it because we don&rsquo;t store it, only a one-way cryptographic hash.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">How do I keep my subscription if there&rsquo;s no email login?</div>
        <div class="faq-a">Your account number is your subscription key. Save it in a password manager, write it down, or store it in a secure note. It works on any device you enter it on. This is the same model Mullvad VPN uses &mdash; your number is your account, and only you know it.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Are you tracking me?</div>
        <div class="faq-a">No. We set no cookies, log no IP addresses, and keep no product search history. Your query exists only in memory for the duration of the request. We store only a cryptographic hash of your account number, your tier, and a daily check counter. That&rsquo;s the entire database record.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">How do you make money?</div>
        <div class="faq-a">Subscriptions. That&rsquo;s it. We sell access to the tool, not data about you. We are closed-source and independently operated. There is no investor pressure to monetize your data. If we ever add affiliate links, they will be clearly labeled as <strong>[affiliate]</strong>.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">What happens if you shut down? I bought a Lifetime plan.</div>
        <div class="faq-a">We take this seriously. Our <a href="/terms" style="color:var(--c-black)">Terms of Service</a> include a specific shutdown policy:
        we will give at least 60 days&rsquo; notice, and we will issue prorated refunds to Founding Supporter holders based on how long the service ran after their purchase (75% within 12 months, 50% within 24 months, 25% within 36 months). We are a small independent service &mdash; &ldquo;unlimited forever&rdquo; means the lifetime of CANDOR, not yours.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Is it unbiased?</div>
        <div class="faq-a">We don&rsquo;t filter results to favor any seller or brand. The AI has no commercial relationship with any product we analyze. Red flags are surfaced even for popular, highly-rated items. The source code for the analysis prompt is available to inspect &mdash; contact us if you want to review it.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Can I use my own AI model or API key?</div>
        <div class="faq-a">Yes. The Advanced Settings panel on the analyze page and extension lets you specify your own AI provider, model, API key, and endpoint (for Ollama, LM Studio, or any OpenAI-compatible API). Your key is used in-memory for that request only and immediately discarded &mdash; never stored or logged. We recommend sticking with the default for best results; other models may produce inconsistent analysis.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">What sources do you check?</div>
        <div class="faq-a">Amazon reviews (including fake-review heuristics), Reddit community discussions, Trustpilot company-level scores, and editorial articles from across the web. All sources are checked in parallel and synthesized into a single verdict.</div>
      </div>

      <div class="faq-item">
        <div class="faq-q">Is this open source?</div>
        <div class="faq-a">No. CANDOR is closed-source. The privacy model and data flow are described transparently in documentation and these FAQs. If you want to verify the privacy claims independently, the extension&rsquo;s network behavior is inspectable via browser DevTools &mdash; you&rsquo;ll see no third-party requests.</div>
      </div>

    </div>
    <p style="font-size:13px;color:var(--c-muted);margin-top:var(--sp-md)">
      More legal details in our <a href="/terms" style="color:var(--c-black)">Terms of Service</a>.
    </p>
  </div>
</div>

`
  return layout('Know before you buy', body)
}
