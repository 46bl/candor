// popup.js — extension popup logic
// Handles account numbers, Advanced Settings, and analysis calls.
// No data is stored beyond api.storage.local (account # and UI prefs).
// The analysis result is held in memory only while the popup is open.
// compat.js is loaded first (see popup.html), so `api` is available here.

'use strict'

;(async function () {
  const $ = (id) => document.getElementById(id)

  const STORAGE_KEY = 'candor_settings'

  // ── Load saved settings ───────────────────────────────────────────────────────
  const settings = await loadSettings()
  const apiUrl   = getApiUrl()

  // Update footer link
  if ($('open-web')) $('open-web').href = `${apiUrl}/analyze`

  // Restore settings panel values
  if ($('settings-account'))  $('settings-account').value  = settings.accountNumber ?? ''
  if ($('settings-provider'))  $('settings-provider').value  = settings.aiProvider  ?? ''
  if ($('settings-model'))     $('settings-model').value     = settings.aiModel     ?? ''
  if ($('settings-baseurl'))   $('settings-baseurl').value   = settings.aiBaseUrl   ?? ''
  // Never restore API key to input — user must re-enter for security

  // Update "get account" links
  const accountUrl = `${apiUrl}/account/new`
  if ($('get-account-link')) $('get-account-link').href = accountUrl
  if ($('go-get-account'))   $('go-get-account').href   = accountUrl
  if ($('get-account-link')) $('get-account-link').addEventListener('click', (e) => {
    e.preventDefault(); api.tabs.create({ url: accountUrl })
  })
  if ($('go-get-account')) $('go-get-account').addEventListener('click', (e) => {
    e.preventDefault(); api.tabs.create({ url: accountUrl })
  })

  // Show no-account hint if no account number saved
  if (!settings.accountNumber && $('no-account-hint')) {
    $('no-account-hint').classList.remove('hidden')
  }

  // ── Settings panel toggle ─────────────────────────────────────────────────────
  if ($('settings-toggle')) {
    $('settings-toggle').addEventListener('click', () => {
      const panel = $('settings-panel')
      const main  = $('main-panel')
      const isOpen = !panel.classList.contains('hidden')
      panel.classList.toggle('hidden', isOpen)
      main.classList.toggle('hidden', !isOpen)
    })
  }

  if ($('settings-save')) {
    $('settings-save').addEventListener('click', async () => {
      const newSettings = {
        accountNumber: ($('settings-account')?.value ?? '').trim(),
        aiProvider:    ($('settings-provider')?.value ?? '').trim(),
        aiModel:       ($('settings-model')?.value ?? '').trim(),
        aiBaseUrl:     ($('settings-baseurl')?.value ?? '').trim(),
        aiApiKey:      ($('settings-apikey')?.value ?? '').trim(),
        // API key stored in api.storage.local (device-only, not synced)
      }
      await api.storage.local.set({ [STORAGE_KEY]: newSettings })
      if ($('settings-saved')) {
        $('settings-saved').classList.remove('hidden')
        setTimeout(() => $('settings-saved').classList.add('hidden'), 1500)
      }
      // Refresh settings in memory
      Object.assign(settings, newSettings)
      // Update no-account hint
      if ($('no-account-hint')) {
        $('no-account-hint').classList.toggle('hidden', !!newSettings.accountNumber)
      }
    })
  }

  // ── Pre-fill from current tab if product page ─────────────────────────────────
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true })
    const tab = tabs[0]
    if (tab?.url && isProductPageUrl(tab.url)) {
      $('product-input').value = tab.url
      if ($('open-web')) {
        $('open-web').href = `${apiUrl}/analyze?q=${encodeURIComponent(tab.url)}`
      }
    }
  } catch {
    // activeTab may not be granted yet
  }

  // ── Event listeners ───────────────────────────────────────────────────────────
  $('analyze-btn').addEventListener('click', () => runAnalysis())
  $('product-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') runAnalysis() })
  if ($('retry-btn')) $('retry-btn').addEventListener('click', () => runAnalysis())

  // ── Core analysis flow ────────────────────────────────────────────────────────
  async function runAnalysis() {
    const input         = ($('product-input')?.value ?? '').trim()
    const accountNumber = settings.accountNumber ?? ''

    if (!input || input.length < 2) {
      $('product-input').focus()
      return
    }

    if (!accountNumber) {
      showError('No account number set. Open Settings (⚙) to enter yours, or get a free one.')
      return
    }

    // Update open-in-web link
    if ($('open-web')) {
      $('open-web').href = `${apiUrl}/analyze?q=${encodeURIComponent(input)}`
    }

    showState('loading')
    $('analyze-btn').disabled = true

    try {
      const result = await callAnalyzeAPI(input, accountNumber)
      renderResult(result)
      showState('results')
    } catch (err) {
      showError(err.message || 'Analysis failed. Check your connection.')
    } finally {
      $('analyze-btn').disabled = false
    }
  }

  async function callAnalyzeAPI(input, accountNumber) {
    // Build custom AI payload if user has configured advanced settings
    const customAI = buildCustomAI()

    return new Promise((resolve, reject) => {
      api.runtime.sendMessage(
        { type: 'ANALYZE', input, accountNumber, customAI },
        (response) => {
          if (api.runtime.lastError) return reject(new Error(api.runtime.lastError.message))
          if (!response)             return reject(new Error('No response from background'))
          if (response.error)        return reject(new Error(response.error))
          resolve(response)
        }
      )
    })
  }

  function buildCustomAI() {
    if (!settings.aiProvider) return undefined
    return {
      provider: settings.aiProvider,
      apiKey:   settings.aiApiKey  || undefined,
      model:    settings.aiModel   || undefined,
      baseUrl:  settings.aiBaseUrl || undefined,
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────────
  function renderResult(r) {
    $('result-product').textContent = r.product || 'Unknown Product'
    $('result-brand').textContent   = r.brand   || ''

    const score = typeof r.score === 'number' ? r.score : 5.0
    $('result-score').textContent = score.toFixed(1)
    $('score-bar').style.width    = `${Math.min(100, (score / 10) * 100).toFixed(1)}%`
    $('result-verdict').textContent = r.verdict || ''

    const qMap = { reliable: 'Reviews: Reliable', mixed: 'Reviews: Mixed', suspicious: 'Reviews: Suspicious', insufficient: 'Reviews: Insufficient' }
    const fMap = { low: 'Fake Risk: Low', medium: 'Fake Risk: Med', high: 'Fake Risk: High' }
    const bq = $('badge-quality')
    const bf = $('badge-fake')
    bq.textContent = qMap[r.reviewQuality] || r.reviewQuality || ''
    bf.textContent = fMap[r.fakeReviewRisk] || r.fakeReviewRisk || ''
    bq.className = 'badge' + (r.reviewQuality === 'suspicious' ? ' warn' : '')
    bf.className = 'badge' + (r.fakeReviewRisk === 'high' ? ' warn' : '')

    renderList('pros-list',  'pros-section',  r.pros     || [])
    renderList('cons-list',  'cons-section',  r.cons     || [])
    renderList('flags-list', 'flags-section', r.redFlags || [])

    const sourcesRow = $('sources-row')
    sourcesRow.innerHTML = ''
    ;(r.sources || []).forEach((s) => {
      const chip = document.createElement('span')
      chip.className   = 'source-chip'
      chip.textContent = `${s.name} (${s.reviewCount})`
      sourcesRow.appendChild(chip)
    })
  }

  function renderList(listId, sectionId, items) {
    const list    = $(listId)
    const section = $(sectionId)
    list.innerHTML = ''
    if (!items.length) { section.classList.add('hidden'); return }
    section.classList.remove('hidden')
    items.forEach((text) => {
      const li = document.createElement('li')
      li.textContent = text
      list.appendChild(li)
    })
  }

  // ── State machine ─────────────────────────────────────────────────────────────
  const STATES = ['loading', 'error', 'empty', 'results']
  function showState(name) {
    STATES.forEach((s) => {
      const el = $(`state-${s}`)
      if (el) el.classList.toggle('hidden', s !== name)
    })
  }
  function showError(msg) {
    const el = $('error-msg')
    if (el) el.textContent = msg
    showState('error')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  async function loadSettings() {
    try {
      const stored = await api.storage.local.get(STORAGE_KEY)
      return stored[STORAGE_KEY] || {}
    } catch { return {} }
  }

  function getApiUrl() {
    if (typeof CANDOR_CONFIG !== 'undefined' && CANDOR_CONFIG.API_URL) {
      return CANDOR_CONFIG.API_URL.replace(/\/$/, '')
    }
    return 'http://localhost:3000'
  }

  function isProductPageUrl(url) {
    return (
      /amazon\.[a-z.]+\/dp\/[A-Z0-9]{10}/i.test(url) ||
      /amazon\.[a-z.]+\/gp\/product\/[A-Z0-9]{10}/i.test(url) ||
      /etsy\.com\/listing\//i.test(url) ||
      /bestbuy\.com\/site\//i.test(url) ||
      /walmart\.com\/ip\//i.test(url)
    )
  }
})()
