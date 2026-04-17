import { layout, escHtml } from './layout.js'
import { renderResult } from './components.js'
import type { AnalysisResult } from '../lib/analyze.js'

export function analyzePage(opts: {
  input?: string
  result?: AnalysisResult
  error?: string
  prefillAccount?: string  // from cookie
}): string {
  const { input = '', result, error, prefillAccount = '' } = opts

  const body = `<div class="analyze-wrap">
  <div class="eyebrow">Product check</div>
  <h1 class="heading-lg">Check a Product</h1>
  <p class="analyze-meta">
    Paste a product URL or type a product name. We check Amazon, Reddit, Trustpilot, and the web.
    Requires an account number. <a href="/account/new" style="color:var(--c-black)">Get one free &rarr;</a>
  </p>

  <form method="POST" action="/analyze" id="analyze-form">

    <!-- Product input -->
    <div class="analyze-form" style="margin-bottom:var(--sp-md)">
      <input
        class="analyze-input"
        type="text"
        name="input"
        placeholder='amazon.com/dp/... or "Sony WH-1000XM5"'
        value="${escHtml(input)}"
        required
        autocomplete="off"
        spellcheck="false"
      >
      <button class="btn btn-primary" type="submit" id="submit-btn">
        Analyze &rarr;
      </button>
    </div>

    <!-- Account number -->
    <div style="margin-bottom:var(--sp-sm)">
      <label style="display:block;font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--c-secondary);margin-bottom:6px">
        Account Number
      </label>
      <input
        class="analyze-input"
        type="text"
        name="accountNumber"
        id="account-input"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        value="${escHtml(prefillAccount)}"
        pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}"
        autocomplete="off"
        spellcheck="false"
        style="width:100%;font-size:15px;letter-spacing:0.06em"
        required
      >
    </div>

    <!-- Remember me checkbox -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-lg)">
      <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--c-muted);cursor:pointer">
        <input type="checkbox" name="rememberAccount" id="remember-checkbox" value="1"
          style="accent-color:#0A0A0A" ${prefillAccount ? 'checked' : ''}>
        Remember my account number <span style="font-family:var(--font-mono);font-size:10px;color:var(--c-hint)">(optional cookie &mdash; see <a href="/privacy#4" style="color:var(--c-hint)">Privacy Policy</a>)</span>
      </label>
      ${prefillAccount ? `<button type="button" id="clear-cookie-btn"
        style="font-family:var(--font-mono);font-size:10px;background:none;border:none;color:var(--c-secondary);cursor:pointer;text-decoration:underline">
        Clear saved account
      </button>` : ''}
    </div>

    <!-- Advanced Settings -->
    <details class="advanced-settings" id="advanced-settings">
      <summary class="advanced-toggle">
        <span>Advanced Settings</span>
        <span class="advanced-toggle-hint">Use your own AI provider, model, or API key</span>
      </summary>

      <div class="advanced-body">

        <!-- Quota explanation — critical clarity -->
        <div class="advanced-quota-box">
          <div style="font-family:var(--font-mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--c-secondary);margin-bottom:8px">
            How this affects your daily limit
          </div>
          <p style="font-size:13px;line-height:1.65;margin-bottom:8px">
            <strong>Custom AI settings do count against your daily quota.</strong>
            The server still fetches reviews from Amazon, Reddit, Trustpilot, and the web
            on your behalf — that work happens regardless of which AI processes it.
          </p>
          <p style="font-size:13px;line-height:1.65;margin-bottom:8px">
            <strong>Bonus for Pro &amp; Lifetime:</strong> Unlimited checks either way.
          </p>
          <p style="font-size:13px;line-height:1.65">
            <strong>Your API key flow:</strong> Your key is sent to the Candor server
            over HTTPS, used in-memory to call your chosen provider for that request,
            then immediately discarded. It is never logged, stored, or used for
            anything else. See <a href="/privacy#3" style="color:var(--c-black)">Privacy Policy §3</a>.
          </p>
        </div>

        <div class="advanced-grid">
          <div class="advanced-field">
            <label class="advanced-label">AI Provider</label>
            <select name="ai_provider" id="ai-provider" class="analyze-input" style="width:100%">
              <option value="">— Server default (recommended) —</option>
              <option value="openai">OpenAI (gpt-4o-mini, gpt-4o, etc.)</option>
              <option value="anthropic">Anthropic (Claude Haiku, Sonnet, etc.)</option>
              <option value="ollama">Ollama — local model via http://localhost:11434</option>
              <option value="lmstudio">LM Studio — local model via http://localhost:1234</option>
              <option value="custom">Custom — any OpenAI-compatible endpoint</option>
            </select>
            <p class="advanced-note">
              CANDOR is tuned for <strong>Llama 3.1 8B Instant (via Groq)</strong> and <strong>Claude Haiku</strong>.
              Other models will work but may produce less structured or less accurate analysis.
            </p>
          </div>

          <div class="advanced-field">
            <label class="advanced-label">Model name</label>
            <input type="text" name="ai_model" id="ai-model" class="analyze-input" style="width:100%"
              placeholder="e.g. llama3.2, gpt-4o-mini, claude-haiku-4-5-20251001"
              autocomplete="off" spellcheck="false">
          </div>

          <div class="advanced-field">
            <label class="advanced-label">
              API Key
              <span style="font-weight:400;color:var(--c-hint);letter-spacing:0;text-transform:none"> — sent over HTTPS, used in-memory, discarded immediately</span>
            </label>
            <input type="password" name="ai_key" class="analyze-input" style="width:100%"
              placeholder="sk-... leave blank to use server default"
              autocomplete="off">
          </div>

          <div class="advanced-field" id="base-url-field" style="display:none">
            <label class="advanced-label">
              Base URL
              <span style="font-weight:400;color:var(--c-hint);letter-spacing:0;text-transform:none"> — required for Ollama, LM Studio, or custom endpoints</span>
            </label>
            <input type="text" name="ai_base_url" id="ai-base-url" class="analyze-input" style="width:100%"
              placeholder="http://localhost:11434"
              autocomplete="off" spellcheck="false">
          </div>
        </div>

        <p style="font-size:11px;color:var(--c-hint);font-family:var(--font-mono);margin-top:var(--sp-sm)">
          Provider preference and model are saved in your browser (localStorage). API keys are never saved.
        </p>
      </div>
    </details>

  </form>

  ${error ? `<div class="error-box" style="margin-top:var(--sp-md)">${escHtml(error)}</div>` : ''}

  ${result ? renderResult(result) : !error ? `<div style="font-family:var(--font-mono);font-size:12px;color:var(--c-secondary);margin-top:var(--sp-lg)">
    Examples:<br>
    &rarr; https://www.amazon.com/dp/B08N5LNQCX<br>
    &rarr; Sony WH-1000XM5<br>
    &rarr; Anker PowerCore 10000
  </div>` : ''}

</div>

<style>
.advanced-settings {
  border: 1px solid var(--c-border);
  background: var(--c-white);
  margin-bottom: var(--sp-md);
}
.advanced-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px var(--sp-md);
  cursor: pointer;
  list-style: none;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-muted);
  user-select: none;
}
.advanced-toggle::-webkit-details-marker { display: none; }
.advanced-toggle-hint { font-weight:400; color:var(--c-hint); text-transform:none; letter-spacing:0; font-size:11px; }
.advanced-body { padding: var(--sp-md); border-top: 1px solid var(--c-border); }
.advanced-quota-box {
  padding: var(--sp-md);
  border: 1px solid var(--c-border);
  background: var(--c-bg);
  margin-bottom: var(--sp-md);
}
.advanced-grid { display: grid; gap: var(--sp-sm); }
.advanced-field { display: grid; gap: 5px; }
.advanced-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-secondary);
}
.advanced-note {
  font-size: 12px;
  color: var(--c-muted);
  line-height: 1.55;
  margin-top: 4px;
}
</style>

<script>
(function() {
  var STORAGE_KEY = 'candor_settings'
  var form        = document.getElementById('analyze-form')
  var btn         = document.getElementById('submit-btn')
  var accountInput = document.getElementById('account-input')
  var rememberBox  = document.getElementById('remember-checkbox')
  var providerSel  = document.getElementById('ai-provider')
  var baseUrlField = document.getElementById('base-url-field')
  var modelInput   = document.getElementById('ai-model')
  var clearBtn     = document.getElementById('clear-cookie-btn')

  // Restore localStorage preferences (provider, model, base URL — never API key)
  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    if (saved.aiProvider && providerSel) providerSel.value = saved.aiProvider
    if (saved.aiModel    && modelInput)  modelInput.value  = saved.aiModel
    var baseEl = document.querySelector('[name=ai_base_url]')
    if (saved.aiBaseUrl  && baseEl)      baseEl.value      = saved.aiBaseUrl
    toggleBaseUrl()
  } catch(e) {}

  // Show/hide Base URL field based on provider
  if (providerSel) {
    providerSel.addEventListener('change', function() {
      toggleBaseUrl()
      try {
        var s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        s.aiProvider = providerSel.value
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch(e) {}
    })
  }

  function toggleBaseUrl() {
    if (!providerSel || !baseUrlField) return
    var needsUrl = ['ollama','lmstudio','custom'].includes(providerSel.value)
    baseUrlField.style.display = needsUrl ? '' : 'none'
    // Set default placeholder per provider
    var baseEl = document.getElementById('ai-base-url')
    if (baseEl) {
      if (providerSel.value === 'ollama')   baseEl.placeholder = 'http://localhost:11434'
      if (providerSel.value === 'lmstudio') baseEl.placeholder = 'http://localhost:1234/v1'
      if (providerSel.value === 'custom')   baseEl.placeholder = 'https://api.your-provider.com/v1'
    }
  }

  // Save model + base URL on change
  ;['ai_model','ai_base_url'].forEach(function(name) {
    var el = document.querySelector('[name=' + name + ']')
    if (!el) return
    el.addEventListener('change', function() {
      try {
        var s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
        if (name === 'ai_model')    s.aiModel   = el.value
        if (name === 'ai_base_url') s.aiBaseUrl = el.value
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      } catch(e) {}
    })
  })

  // Clear saved account cookie
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      document.cookie = 'candor_account=; Path=/; Max-Age=0; SameSite=Strict'
      if (accountInput) accountInput.value = ''
      if (rememberBox)  rememberBox.checked = false
      clearBtn.style.display = 'none'
    })
  }

  // Loading state on submit
  if (form && btn) {
    form.addEventListener('submit', function() {
      btn.textContent = 'Analyzing...'
      btn.disabled = true
    })
  }
})();
</script>`

  const title = result ? result.product : 'Check a Product'
  return layout(title, body, { noindex: !!result })
}
